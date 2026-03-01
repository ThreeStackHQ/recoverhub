/**
 * RecoverHub Worker — Job Processors
 *
 * Job types:
 *   1. "batch-scan"    — Fetches due retry attempts and enqueues individual jobs
 *   2. "retry-job"     — Executes a single retry attempt
 *   3. "dunning-scan"  — Fetches due dunning emails and enqueues individual jobs
 *   4. "dunning-email" — Sends a single dunning email via Resend
 */

import { Worker, Job } from "bullmq";
import { fetchDueRetries, executeRetryAttempt } from "./retry";
import { fetchDueDunningEmails, executeDunningEmail } from "./dunning";
import {
  connection,
  retryQueue,
  dunningQueue,
  RETRY_QUEUE_NAME,
  DUNNING_QUEUE_NAME,
  type RetryJobData,
  type BatchScanJobData,
  type DunningEmailJobData,
  type DunningScanJobData,
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

// ─── Dunning Scan Processor ───────────────────────────────────────────────────

async function processDunningScan(job: Job<DunningScanJobData>): Promise<void> {
  const batchSize = job.data.batchSize ?? DEFAULT_BATCH_SIZE;

  console.log(
    `[dunning-scan] 🔍 Starting scan (triggeredAt=${job.data.triggeredAt}, batchSize=${batchSize})`
  );

  await job.updateProgress(10);

  const dueEmails = await fetchDueDunningEmails(batchSize);

  console.log(`[dunning-scan] Found ${dueEmails.length} due dunning email(s)`);

  if (dueEmails.length === 0) {
    console.log("[dunning-scan] ✅ Nothing to send");
    return;
  }

  await job.updateProgress(40);

  // Enqueue one dunning-email job per due email
  const jobPayloads = dueEmails.map((d) => ({
    name: "dunning-email",
    data: {
      failedPaymentId: d.failedPaymentId,
      templateId: d.templateId,
      sequenceOrder: d.sequenceOrder,
    } satisfies DunningEmailJobData,
    opts: {
      // Deduplicate: one send per payment+template
      jobId: `dunning:${d.failedPaymentId}:seq${d.sequenceOrder}`,
    },
  }));

  await dunningQueue.addBulk(jobPayloads);

  await job.updateProgress(100);

  console.log(`[dunning-scan] ✅ Enqueued ${dueEmails.length} dunning email job(s)`);
}

// ─── Dunning Email Processor ──────────────────────────────────────────────────

async function processDunningEmail(job: Job<DunningEmailJobData>): Promise<void> {
  const { failedPaymentId, templateId, sequenceOrder } = job.data;

  console.log(
    `[dunning-email] 📧 Sending dunning seq=${sequenceOrder} for payment ${failedPaymentId}`
  );

  await job.updateProgress(20);

  const result = await executeDunningEmail({ failedPaymentId, templateId, sequenceOrder });

  await job.updateProgress(100);

  if (result.success) {
    if (result.resendMessageId) {
      console.log(
        `[dunning-email] ✅ Sent: ${failedPaymentId} (msgId=${result.resendMessageId})`
      );
    } else {
      // Payment recovered/cancelled — email intentionally skipped
      console.log(`[dunning-email] ⏭️  Skipped (payment no longer active): ${failedPaymentId}`);
    }
  } else {
    throw new Error(result.error ?? "Unknown dunning error");
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

// ─── Dunning Worker Factory ───────────────────────────────────────────────────

export function createDunningWorker(): Worker {
  const worker = new Worker<DunningEmailJobData | DunningScanJobData>(
    DUNNING_QUEUE_NAME,
    async (job: Job) => {
      if (job.name === "dunning-scan") {
        await processDunningScan(job as Job<DunningScanJobData>);
      } else if (job.name === "dunning-email") {
        await processDunningEmail(job as Job<DunningEmailJobData>);
      } else {
        console.warn(`[dunning-worker] Unknown job type: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: CONCURRENCY,
      autorun: false,
    }
  );

  worker.on("completed", (job: Job) => {
    console.log(`[dunning-worker] ✅ Completed: ${job.name}#${job.id}`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(
      `[dunning-worker] ❌ Failed: ${job?.name ?? "unknown"}#${job?.id ?? "?"}`,
      err.message
    );
  });

  worker.on("error", (err: Error) => {
    console.error("[dunning-worker] Worker error:", err.message);
  });

  return worker;
}
