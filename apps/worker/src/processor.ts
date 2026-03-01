/**
 * RecoverHub Worker — Job Processors
 *
 * Two job types processed by one worker:
 *   1. "batch-scan"  — Fetches due retry attempts and enqueues individual jobs
 *   2. "retry-job"   — Executes a single retry attempt
 */

import { Worker, Job } from "bullmq";
import { fetchDueRetries, executeRetryAttempt } from "./retry";
import {
  connection,
  retryQueue,
  RETRY_QUEUE_NAME,
  type RetryJobData,
  type BatchScanJobData,
} from "./queue";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 50;
const CONCURRENCY = 5;

// ─── Batch Scan Processor ─────────────────────────────────────────────────────

async function processBatchScan(job: Job<BatchScanJobData>): Promise<void> {
  const batchSize = job.data.batchSize ?? DEFAULT_BATCH_SIZE;

  console.log(
    `[batch-scan] 🔍 Starting scan (triggeredAt=${job.data.triggeredAt}, batchSize=${batchSize})`
  );

  await job.updateProgress(10);

  const dueRetries = await fetchDueRetries(batchSize);

  console.log(`[batch-scan] Found ${dueRetries.length} due retry attempt(s)`);

  if (dueRetries.length === 0) {
    console.log("[batch-scan] ✅ Nothing to process");
    return;
  }

  await job.updateProgress(40);

  // Enqueue one retry-job per due attempt
  const jobPayloads = dueRetries.map((r) => ({
    name: "retry-job",
    data: {
      failedPaymentId: r.failedPaymentId,
      attemptId: r.attemptId,
      attemptNumber: r.attemptNumber,
    } satisfies RetryJobData,
  }));

  await retryQueue.addBulk(jobPayloads);

  await job.updateProgress(100);

  console.log(`[batch-scan] ✅ Enqueued ${dueRetries.length} retry job(s)`);
}

// ─── Retry Job Processor ──────────────────────────────────────────────────────

async function processRetryJob(job: Job<RetryJobData>): Promise<void> {
  const { failedPaymentId, attemptId, attemptNumber } = job.data;

  console.log(
    `[retry-job] ⚡ Attempt #${attemptNumber} for payment ${failedPaymentId}`
  );

  await job.updateProgress(20);

  const result = await executeRetryAttempt(failedPaymentId, attemptId);

  await job.updateProgress(100);

  if (result.success) {
    console.log(`[retry-job] ✅ Recovered: ${failedPaymentId}`);
  } else {
    const nextInfo = result.nextRetryAt
      ? ` | next: ${result.nextRetryAt.toISOString()}`
      : " | paused (all attempts exhausted)";
    console.log(`[retry-job] ❌ Attempt #${attemptNumber} failed: ${result.error}${nextInfo}`);
  }
}

// ─── Worker Factory ───────────────────────────────────────────────────────────

export function createRetryWorker(): Worker {
  const worker = new Worker<RetryJobData | BatchScanJobData>(
    RETRY_QUEUE_NAME,
    async (job: Job) => {
      if (job.name === "batch-scan") {
        await processBatchScan(job as Job<BatchScanJobData>);
      } else if (job.name === "retry-job") {
        await processRetryJob(job as Job<RetryJobData>);
      } else {
        console.warn(`[worker] Unknown job type: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: CONCURRENCY,
      autorun: false,
    }
  );

  worker.on("completed", (job: Job) => {
    console.log(`[worker] ✅ Completed: ${job.name}#${job.id}`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(
      `[worker] ❌ Failed: ${job?.name ?? "unknown"}#${job?.id ?? "?"}`,
      err.message
    );
  });

  worker.on("error", (err: Error) => {
    console.error("[worker] Worker error:", err.message);
  });

  return worker;
}
