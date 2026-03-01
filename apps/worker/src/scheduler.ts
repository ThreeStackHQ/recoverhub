/**
 * RecoverHub Worker — Job Scheduler
 *
 * Registers repeating jobs in BullMQ:
 *   - batch-scan  → runs every 6 hours (21600 seconds)
 *
 * Idempotent: calling upsertScheduledJobs() multiple times is safe.
 * Existing repeatable jobs with the same key are replaced, not duplicated.
 */

import { retryQueue, dunningQueue } from "./queue";
import type { BatchScanJobData, DunningScanJobData } from "./queue";

// ─── Schedule Constants ───────────────────────────────────────────────────────

/** How often to scan for due retries (every 6 hours). */
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1_000; // 6 hours

/** How often to scan for due dunning emails (every hour). */
const DUNNING_SCAN_INTERVAL_MS = 60 * 60 * 1_000; // 1 hour

/** Repeatable job key for idempotency. */
const BATCH_SCAN_JOB_KEY = "recoverhub:batch-scan";
const DUNNING_SCAN_JOB_KEY = "recoverhub:dunning-scan";

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

  console.log(`[scheduler] ✅ Queued immediate startup retry scan`);

  // ─── Dunning Email Scan (every hour) ─────────────────────────────────────
  const dunningJobData: DunningScanJobData = {
    triggeredAt: new Date().toISOString(),
    batchSize: 50,
  };

  await dunningQueue.add("dunning-scan", dunningJobData, {
    repeat: {
      every: DUNNING_SCAN_INTERVAL_MS,
    },
    jobId: DUNNING_SCAN_JOB_KEY,
  });

  console.log(
    `[scheduler] ✅ Registered dunning-scan repeating job (every 1 hour)`
  );

  // Also run dunning scan immediately on startup
  await dunningQueue.add(
    "dunning-scan",
    { triggeredAt: new Date().toISOString(), batchSize: 50 },
    { jobId: `${DUNNING_SCAN_JOB_KEY}:startup` }
  );

  console.log(`[scheduler] ✅ Queued immediate startup dunning scan`);
}

/**
 * Lists all currently registered repeating jobs for all queues (for debugging).
 */
export async function listScheduledJobs(): Promise<void> {
  const retryJobs = await retryQueue.getRepeatableJobs();
  const dunningJobs = await dunningQueue.getRepeatableJobs();
  const allJobs = [
    ...retryJobs.map((j) => ({ ...j, queue: "retry-queue" })),
    ...dunningJobs.map((j) => ({ ...j, queue: "dunning-queue" })),
  ];

  if (allJobs.length === 0) {
    console.log("[scheduler] No repeating jobs registered");
    return;
  }
  console.log(`[scheduler] Repeating jobs (${allJobs.length}):`);
  for (const job of allJobs) {
    const next = job.next ? new Date(job.next).toISOString() : "N/A";
    console.log(`  - [${job.queue}] ${job.name} | every ${job.every}ms | next: ${next}`);
  }
}
