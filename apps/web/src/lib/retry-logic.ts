/**
 * RecoverHub — Retry Logic Module
 *
 * Handles automatic payment retry attempts for failed Stripe invoices.
 *
 * Retry schedule:
 *   Attempt 1 → Day 3 after failure
 *   Attempt 2 → Day 7 after failure
 *   Attempt 3 → Day 14 after failure
 *   (After 3 failures → status: "paused", no more automatic retries)
 *
 * Flow:
 *   1. Fetch due retry attempt (scheduledAt <= now, status: "pending")
 *   2. Decrypt Stripe access token from the connected account
 *   3. Call Stripe API: POST /v1/invoices/:id/pay
 *   4. On success: mark failed_payment as "recovered", attempt as "success"
 *   5. On failure: mark attempt as "failed", schedule next or pause if exhausted
 *
 * Used by: BullMQ worker (Sprint 1.10) and manual retry API (Sprint 1.12)
 */

import {
  db,
  failedPayments,
  retryAttempts,
} from "@recoverhub/db";
import { eq, and, lte } from "drizzle-orm";
import { decrypt } from "./encrypt";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetryResult {
  success: boolean;
  failedPaymentId: string;
  attemptId: string;
  attemptNumber: number;
  error?: string;
  /** Next retry scheduled at (null if no more retries). */
  nextRetryAt?: Date | null;
}

export interface StripePayError {
  type: string;
  code?: string;
  decline_code?: string;
  message: string;
  payment_intent?: { status: string };
}

// ─── Retry schedule ───────────────────────────────────────────────────────────

/** Days offset from the original failure date for each attempt. */
const RETRY_SCHEDULE_DAYS = [3, 7, 14] as const;
const MAX_ATTEMPTS = RETRY_SCHEDULE_DAYS.length;

/**
 * Calculate the next retry date based on:
 *   - The original failure timestamp (failed_payment.recovery_started_at)
 *   - The next attempt number (1-indexed)
 *
 * Returns null if all attempts are exhausted.
 */
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

/**
 * Build the full retry schedule for a given failure date.
 * Returns an array of { attemptNumber, scheduledAt } objects.
 */
export function buildRetrySchedule(
  recoveryStartedAt: Date
): Array<{ attemptNumber: number; scheduledAt: Date }> {
  return RETRY_SCHEDULE_DAYS.map((days, i) => {
    const scheduledAt = new Date(recoveryStartedAt.getTime());
    scheduledAt.setDate(scheduledAt.getDate() + days);
    return { attemptNumber: i + 1, scheduledAt };
  });
}

// ─── Stripe payment API call ──────────────────────────────────────────────────

/**
 * Attempt to pay a Stripe invoice using the connected account's access token.
 * Calls: POST /v1/invoices/:invoiceId/pay
 *
 * @param invoiceId - Stripe invoice ID (in_xxx)
 * @param accessToken - Decrypted Stripe access token
 * @returns { success, error }
 */
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
    // Empty body — uses default payment method from the invoice
    body: "",
  });

  if (response.ok) {
    return { success: true };
  }

  let error: StripePayError;
  try {
    const body = await response.json() as { error: StripePayError };
    error = body.error;
  } catch {
    error = {
      type: "api_error",
      message: `HTTP ${response.status} ${response.statusText}`,
    };
  }

  // 402 = payment method declined — expected failure
  // 404 = invoice not found (shouldn't happen but handle gracefully)
  return { success: false, error };
}

// ─── Core retry executor ──────────────────────────────────────────────────────

/**
 * Execute a single retry attempt for a failed payment.
 *
 * @param failedPaymentId - UUID of the failed_payment record
 * @param attemptId - UUID of the retry_attempt to execute
 */
export async function executeRetryAttempt(
  failedPaymentId: string,
  attemptId: string
): Promise<RetryResult> {
  // 1. Fetch the failed payment
  const payment = await db.query.failedPayments.findFirst({
    where: eq(failedPayments.id, failedPaymentId),
    with: { stripeConnection: true },
  });

  if (!payment) {
    throw new Error(`Failed payment not found: ${failedPaymentId}`);
  }

  if (payment.status !== "active") {
    throw new Error(
      `Payment ${failedPaymentId} is not in 'active' state (current: ${payment.status})`
    );
  }

  if (!payment.stripeInvoiceId) {
    throw new Error(`Payment ${failedPaymentId} has no stripeInvoiceId — cannot retry`);
  }

  // 2. Fetch & decrypt the access token
  const connection = payment.stripeConnection;
  if (!connection) {
    throw new Error(`No Stripe connection for payment ${failedPaymentId}`);
  }

  let accessToken: string;
  try {
    accessToken = decrypt({
      enc: connection.accessTokenEncrypted,
      iv: connection.tokenIv,
      tag: connection.tokenAuthTag,
    });
  } catch (err) {
    throw new Error(
      `Failed to decrypt Stripe token for connection ${connection.id}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 3. Mark attempt as attempted
  await db
    .update(retryAttempts)
    .set({ attemptedAt: new Date() })
    .where(eq(retryAttempts.id, attemptId));

  // 4. Call Stripe API
  const { success, error: stripeError } = await attemptStripePayment(
    payment.stripeInvoiceId,
    accessToken
  );

  const attempt = await db.query.retryAttempts.findFirst({
    where: eq(retryAttempts.id, attemptId),
  });

  const attemptNumber = attempt?.attemptNumber ?? 1;

  if (success) {
    // ── Payment recovered ────────────────────────────────────────────────────

    // Mark attempt as success
    await db
      .update(retryAttempts)
      .set({ status: "success", attemptedAt: new Date() })
      .where(eq(retryAttempts.id, attemptId));

    // Mark failed payment as recovered
    await db
      .update(failedPayments)
      .set({
        status: "recovered",
        recoveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(failedPayments.id, failedPaymentId));

    // Cancel any remaining pending retries
    await db
      .update(retryAttempts)
      .set({ status: "skipped" })
      .where(
        and(
          eq(retryAttempts.failedPaymentId, failedPaymentId),
          eq(retryAttempts.status, "pending")
        )
      );

    console.log(
      `[retry] ✅ Payment recovered: failed_payment=${failedPaymentId}, invoice=${payment.stripeInvoiceId}`
    );

    return {
      success: true,
      failedPaymentId,
      attemptId,
      attemptNumber,
      nextRetryAt: null,
    };
  } else {
    // ── Payment failed ───────────────────────────────────────────────────────

    const errorMessage =
      stripeError?.decline_code ??
      stripeError?.code ??
      stripeError?.message ??
      "unknown_error";

    // Mark attempt as failed
    await db
      .update(retryAttempts)
      .set({ status: "failed", attemptedAt: new Date() })
      .where(eq(retryAttempts.id, attemptId));

    const nextAttemptNumber = attemptNumber + 1;
    const nextRetryAt = payment.recoveryStartedAt
      ? calculateNextRetryAt(payment.recoveryStartedAt, nextAttemptNumber)
      : null;

    if (nextRetryAt) {
      // Schedule next retry
      await db.insert(retryAttempts).values({
        failedPaymentId,
        attemptNumber: nextAttemptNumber,
        scheduledAt: nextRetryAt,
        status: "pending",
      });

      console.log(
        `[retry] ⏳ Attempt ${attemptNumber} failed (${errorMessage}), ` +
          `next retry #${nextAttemptNumber} scheduled for ${nextRetryAt.toISOString()}`
      );
    } else {
      // All attempts exhausted — pause recovery
      await db
        .update(failedPayments)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(failedPayments.id, failedPaymentId));

      console.log(
        `[retry] ❌ All ${MAX_ATTEMPTS} attempts exhausted for payment ${failedPaymentId} — paused`
      );
    }

    return {
      success: false,
      failedPaymentId,
      attemptId,
      attemptNumber,
      error: errorMessage,
      nextRetryAt,
    };
  }
}

// ─── Batch: fetch due retries ─────────────────────────────────────────────────

export interface DueRetry {
  failedPaymentId: string;
  attemptId: string;
  attemptNumber: number;
  invoiceId: string | null;
}

/**
 * Fetch all retry attempts that are due for execution (scheduledAt <= now).
 * Used by the BullMQ worker to pick up pending retries.
 *
 * @param limit - Maximum number of retries to return per batch (default 50)
 */
export async function fetchDueRetries(limit = 50): Promise<DueRetry[]> {
  const now = new Date();

  const due = await db
    .select({
      attemptId: retryAttempts.id,
      failedPaymentId: retryAttempts.failedPaymentId,
      attemptNumber: retryAttempts.attemptNumber,
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

  // Fetch invoice IDs for context
  const result: DueRetry[] = await Promise.all(
    due.map(async (row) => {
      const payment = await db.query.failedPayments.findFirst({
        where: eq(failedPayments.id, row.failedPaymentId),
        columns: { stripeInvoiceId: true },
      });
      return {
        failedPaymentId: row.failedPaymentId,
        attemptId: row.attemptId,
        attemptNumber: row.attemptNumber,
        invoiceId: payment?.stripeInvoiceId ?? null,
      };
    })
  );

  return result;
}

// ─── Manual retry ─────────────────────────────────────────────────────────────

/**
 * Trigger an immediate manual retry for a failed payment.
 * Creates a new retry_attempt with scheduledAt = now and executes it.
 *
 * Used by the "Retry Now" button in the dashboard (Sprint 1.12).
 *
 * @param failedPaymentId - UUID of the failed_payment record
 * @param userId - Authenticated user's UUID (for ownership check)
 */
export async function manualRetry(
  failedPaymentId: string,
  userId: string
): Promise<RetryResult> {
  // Ownership check
  const payment = await db.query.failedPayments.findFirst({
    where: and(
      eq(failedPayments.id, failedPaymentId),
      eq(failedPayments.userId, userId)
    ),
    with: {
      retryAttempts: {
        orderBy: (t, { desc }) => [desc(t.attemptNumber)],
        limit: 1,
      },
    },
  });

  if (!payment) {
    throw new Error(
      `Payment ${failedPaymentId} not found or not owned by user ${userId}`
    );
  }

  if (payment.status === "recovered") {
    throw new Error(`Payment ${failedPaymentId} is already recovered`);
  }

  // Re-activate if paused for manual retry
  if (payment.status === "paused") {
    await db
      .update(failedPayments)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(failedPayments.id, failedPaymentId));
  }

  const lastAttempt = payment.retryAttempts[0];
  const nextAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

  // Create an immediate retry attempt
  const [newAttempt] = await db
    .insert(retryAttempts)
    .values({
      failedPaymentId,
      attemptNumber: nextAttemptNumber,
      scheduledAt: new Date(), // now
      status: "pending",
    })
    .returning({ id: retryAttempts.id });

  if (!newAttempt) {
    throw new Error("Failed to create retry attempt");
  }

  return executeRetryAttempt(failedPaymentId, newAttempt.id);
}
