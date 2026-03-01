/**
 * RecoverHub Worker — Job Scheduler
 *
 * Registers repeating jobs in BullMQ:
 *   - batch-scan  → runs every 6 hours (21600 seconds)
 *
 * Idempotent: calling upsertScheduledJobs() multiple times is safe.
 * Existing repeatable jobs with the same key are replaced, not duplicated.
 */

import { retryQueue } from "./queue";
import type { BatchScanJobData } from "./queue";

// ─── Schedule Constants ───────────────────────────────────────────────────────

/** How often to scan for due retries (every 6 hours). */
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1_000; // 6 hours

/** Repeatable job key for idempotency. */
const BATCH_SCAN_JOB_KEY = "recoverhub:batch-scan";

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Registers (or refreshes) the repeating batch-scan job in the queue.
 * Safe to call on every startup — BullMQ deduplicates by jobId.
 */
export async function upsertScheduledJobs(): Promise<void> {
  const jobData: BatchScanJobData = {
    triggeredAt: new Date().toISOString(),
    batchSize: 50,
  };

  // Add repeating job — every 6 hours
  await retryQueue.add("batch-scan", jobData, {
    repeat: {
      every: SCAN_INTERVAL_MS,
    },
    jobId: BATCH_SCAN_JOB_KEY,
  });

  console.log(
    `[scheduler] ✅ Registered batch-scan repeating job (every 6 hours)`
  );

  // Also run once immediately on startup
  await retryQueue.add(
    "batch-scan",
    { triggeredAt: new Date().toISOString(), batchSize: 50 },
    { jobId: `${BATCH_SCAN_JOB_KEY}:startup` }
  );

  console.log(`[scheduler] ✅ Queued immediate startup scan`);
}

/**
 * Lists all currently registered repeating jobs (for debugging).
 */
export async function listScheduledJobs(): Promise<void> {
  const repeatableJobs = await retryQueue.getRepeatableJobs();
  if (repeatableJobs.length === 0) {
    console.log("[scheduler] No repeating jobs registered");
    return;
  }
  console.log(`[scheduler] Repeating jobs (${repeatableJobs.length}):`);
  for (const job of repeatableJobs) {
    const next = job.next ? new Date(job.next).toISOString() : "N/A";
    console.log(`  - ${job.name} | every ${job.every}ms | next: ${next}`);
  }
}
