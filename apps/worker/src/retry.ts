/**
 * RecoverHub Worker — Retry Execution Logic
 *
 * Mirrors apps/web/src/lib/retry-logic.ts.
 * Future: move to packages/core for deduplication.
 *
 * Schedule:
 *   Attempt 1 → Day 3 after failure
 *   Attempt 2 → Day 7 after failure
 *   Attempt 3 → Day 14 after failure
 */

import {
  db,
  failedPayments,
  retryAttempts,
} from "@recoverhub/db";
import { eq, and, lte } from "drizzle-orm";
import { decrypt } from "./encrypt";

// ─── Retry schedule ───────────────────────────────────────────────────────────

const RETRY_SCHEDULE_DAYS = [3, 7, 14] as const;
const MAX_ATTEMPTS = RETRY_SCHEDULE_DAYS.length;

export function calculateNextRetryAt(
  recoveryStartedAt: Date,
  nextAttemptNumber: number
): Date | null {
  if (nextAttemptNumber > MAX_ATTEMPTS) return null;
  const daysOffset = RETRY_SCHEDULE_DAYS[nextAttemptNumber - 1];
  const nextDate = new Date(recoveryStartedAt.getTime());
  nextDate.setDate(nextDate.getDate() + daysOffset);
  return nextDate;
}

// ─── Stripe payment API call ──────────────────────────────────────────────────

interface StripePayError {
  type: string;
  code?: string;
  decline_code?: string;
  message: string;
}

async function attemptStripePayment(
  invoiceId: string,
  accessToken: string
): Promise<{ success: boolean; error?: StripePayError }> {
  const url = `https://api.stripe.com/v1/invoices/${encodeURIComponent(invoiceId)}/pay`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "",
  });

  if (response.ok) return { success: true };

  let error: StripePayError;
  try {
    const body = (await response.json()) as { error: StripePayError };
    error = body.error;
  } catch {
    error = {
      type: "api_error",
      message: `HTTP ${response.status} ${response.statusText}`,
    };
  }

  return { success: false, error };
}

// ─── Core retry executor ──────────────────────────────────────────────────────

export interface RetryResult {
  success: boolean;
  failedPaymentId: string;
  attemptId: string;
  attemptNumber: number;
  error?: string;
  nextRetryAt?: Date | null;
}

export async function executeRetryAttempt(
  failedPaymentId: string,
  attemptId: string
): Promise<RetryResult> {
  // 1. Fetch failed payment + connection
  const payment = await db.query.failedPayments.findFirst({
    where: eq(failedPayments.id, failedPaymentId),
    with: { stripeConnection: true },
  });

  if (!payment) throw new Error(`Failed payment not found: ${failedPaymentId}`);
  if (payment.status !== "active") {
    throw new Error(`Payment ${failedPaymentId} not in 'active' state (current: ${payment.status})`);
  }
  if (!payment.stripeInvoiceId) {
    throw new Error(`Payment ${failedPaymentId} has no stripeInvoiceId`);
  }

  const connection = payment.stripeConnection;
  if (!connection) throw new Error(`No Stripe connection for payment ${failedPaymentId}`);

  // 2. Decrypt access token
  const accessToken = decrypt({
    enc: connection.accessTokenEncrypted,
    iv: connection.tokenIv,
    tag: connection.tokenAuthTag,
  });

  // 3. Mark attempt as in-progress
  await db
    .update(retryAttempts)
    .set({ attemptedAt: new Date() })
    .where(eq(retryAttempts.id, attemptId));

  // 4. Fetch attempt number
  const attempt = await db.query.retryAttempts.findFirst({
    where: eq(retryAttempts.id, attemptId),
    columns: { attemptNumber: true },
  });
  const attemptNumber = attempt?.attemptNumber ?? 1;

  // 5. Call Stripe
  const { success, error: stripeError } = await attemptStripePayment(
    payment.stripeInvoiceId,
    accessToken
  );

  if (success) {
    // Mark attempt + payment as recovered
    await db
      .update(retryAttempts)
      .set({ status: "success", attemptedAt: new Date() })
      .where(eq(retryAttempts.id, attemptId));

    await db
      .update(failedPayments)
      .set({ status: "recovered", recoveredAt: new Date(), updatedAt: new Date() })
      .where(eq(failedPayments.id, failedPaymentId));

    // Skip remaining pending retries
    await db
      .update(retryAttempts)
      .set({ status: "skipped" })
      .where(
        and(
          eq(retryAttempts.failedPaymentId, failedPaymentId),
          eq(retryAttempts.status, "pending")
        )
      );

    console.log(`[retry] ✅ Recovered: payment=${failedPaymentId}`);
    return { success: true, failedPaymentId, attemptId, attemptNumber, nextRetryAt: null };
  }

  // Mark attempt as failed
  const errorMessage =
    stripeError?.decline_code ?? stripeError?.code ?? stripeError?.message ?? "unknown_error";

  await db
    .update(retryAttempts)
    .set({ status: "failed", attemptedAt: new Date() })
    .where(eq(retryAttempts.id, attemptId));

  const nextAttemptNumber = attemptNumber + 1;
  const nextRetryAt = payment.recoveryStartedAt
    ? calculateNextRetryAt(payment.recoveryStartedAt, nextAttemptNumber)
    : null;

  if (nextRetryAt) {
    await db.insert(retryAttempts).values({
      failedPaymentId,
      attemptNumber: nextAttemptNumber,
      scheduledAt: nextRetryAt,
      status: "pending",
    });
    console.log(`[retry] ⏳ Attempt #${attemptNumber} failed, next retry scheduled: ${nextRetryAt.toISOString()}`);
  } else {
    await db
      .update(failedPayments)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(failedPayments.id, failedPaymentId));
    console.log(`[retry] ❌ All ${MAX_ATTEMPTS} attempts exhausted — paused payment ${failedPaymentId}`);
  }

  return { success: false, failedPaymentId, attemptId, attemptNumber, error: errorMessage, nextRetryAt };
}

// ─── Batch fetch due retries ──────────────────────────────────────────────────

export interface DueRetry {
  failedPaymentId: string;
  attemptId: string;
  attemptNumber: number;
  invoiceId: string | null;
}

export async function fetchDueRetries(limit = 50): Promise<DueRetry[]> {
  const now = new Date();

  const due = await db
    .select({
      attemptId: retryAttempts.id,
      failedPaymentId: retryAttempts.failedPaymentId,
      attemptNumber: retryAttempts.attemptNumber,
      invoiceId: failedPayments.stripeInvoiceId,
    })
    .from(retryAttempts)
    .innerJoin(
      failedPayments,
      and(
        eq(retryAttempts.failedPaymentId, failedPayments.id),
        eq(failedPayments.status, "active")
      )
    )
    .where(
      and(
        eq(retryAttempts.status, "pending"),
        lte(retryAttempts.scheduledAt, now)
      )
    )
    .limit(limit);

  return due.map((row) => ({
    failedPaymentId: row.failedPaymentId,
    attemptId: row.attemptId,
    attemptNumber: row.attemptNumber,
    invoiceId: row.invoiceId ?? null,
  }));
}
