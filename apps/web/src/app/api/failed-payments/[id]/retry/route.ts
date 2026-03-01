/**
 * Sprint 1.12 — Manual Retry Action
 *
 * POST /api/failed-payments/:id/retry
 *
 * Triggers an immediate, high-priority payment retry for a specific failed payment,
 * bypassing the normal 6h batch-scan schedule.
 *
 * - Validates ownership via session
 * - Creates a new retry_attempts record (pending, scheduledAt=now)
 * - Enqueues a high-priority BullMQ retry-job (priority=1)
 * - Returns { success, attemptId, jobId }
 *
 * Errors:
 *   401 - Not authenticated
 *   403 - Payment does not belong to user
 *   404 - Payment not found
 *   409 - Payment already recovered/cancelled
 *   429 - Too many retries (max 3 manual retries per payment per 24h)
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  db,
  failedPayments,
  retryAttempts,
} from "@recoverhub/db";
import { eq, and, gte, count } from "drizzle-orm";
import { getRetryQueue, type RetryJobData } from "@/lib/queue-client";

// Max manual retries within 24h to prevent abuse
const MAX_MANUAL_RETRIES_PER_DAY = 3;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: failedPaymentId } = params;

  // 2. Load payment + ownership check
  const [payment] = await db
    .select()
    .from(failedPayments)
    .where(eq(failedPayments.id, failedPaymentId))
    .limit(1);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Payment must be active to retry
  if (payment.status !== "active") {
    return NextResponse.json(
      {
        error: `Payment is ${payment.status} — cannot retry`,
        status: payment.status,
      },
      { status: 409 }
    );
  }

  // 4. Rate limit: max 3 manual retries per payment per 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  const [{ total }] = await db
    .select({ total: count() })
    .from(retryAttempts)
    .where(
      and(
        eq(retryAttempts.failedPaymentId, failedPaymentId),
        gte(retryAttempts.scheduledAt, oneDayAgo)
      )
    );

  if (total >= MAX_MANUAL_RETRIES_PER_DAY) {
    return NextResponse.json(
      {
        error: `Too many retries — max ${MAX_MANUAL_RETRIES_PER_DAY} per 24h`,
        retryAfter: oneDayAgo.toISOString(),
      },
      { status: 429 }
    );
  }

  // 5. Get next attempt number
  const [{ attemptCount }] = await db
    .select({ attemptCount: count() })
    .from(retryAttempts)
    .where(eq(retryAttempts.failedPaymentId, failedPaymentId));

  const attemptNumber = (Number(attemptCount) || 0) + 1;

  // 6. Create retry_attempts record
  const [attempt] = await db
    .insert(retryAttempts)
    .values({
      failedPaymentId,
      attemptNumber,
      scheduledAt: new Date(),
      status: "pending",
    })
    .returning();

  if (!attempt) {
    return NextResponse.json(
      { error: "Failed to create retry attempt" },
      { status: 500 }
    );
  }

  // 7. Enqueue high-priority BullMQ job (priority=1 = highest)
  try {
    const queue = getRetryQueue();
    const jobData: RetryJobData = {
      failedPaymentId,
      attemptId: attempt.id,
      attemptNumber,
    };

    const job = await queue.add("retry-job", jobData, {
      priority: 1, // Highest priority — bypasses queued jobs
      jobId: `manual-retry:${failedPaymentId}:${attempt.id}`,
    });

    console.log(
      `[manual-retry] ✅ Enqueued retry job for payment ${failedPaymentId} (jobId=${job.id})`
    );

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      attemptNumber,
      jobId: job.id,
      message: "Retry queued — check back in a few seconds",
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[manual-retry] Failed to enqueue: ${errMsg}`);
    return NextResponse.json(
      { error: "Failed to enqueue retry job", details: errMsg },
      { status: 500 }
    );
  }
}
