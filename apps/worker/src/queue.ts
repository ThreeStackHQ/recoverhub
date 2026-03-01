/**
 * RecoverHub Worker — Redis Connection & Queue Setup
 *
 * Uses BullMQ with Upstash Redis (or any Redis-compatible instance).
 * Queue: "retry-queue" — processes due payment retries every 6 hours.
 */

import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

// ─── Redis Connection ─────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * BullMQ-compatible Redis connection.
 * Uses maxRetriesPerRequest=null as required by BullMQ.
 */
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redisConnection.on("error", (err: Error) => {
  console.error("[redis] Connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("[redis] Connected ✅");
});

// Cast to BullMQ ConnectionOptions (ioredis version mismatch workaround)
export const connection = redisConnection as unknown as ConnectionOptions;

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const RETRY_QUEUE_NAME = "retry-queue";
export const DUNNING_QUEUE_NAME = "dunning-queue";

// ─── Queue Definitions ────────────────────────────────────────────────────────

/** The main retry queue — processes payment retry batches. */
export const retryQueue = new Queue(RETRY_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000, // 5s base, 10s, 20s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/** The dunning email queue — schedules + sends dunning emails. */
export const dunningQueue = new Queue(DUNNING_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000, // 10s base
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// ─── Job Data Types ───────────────────────────────────────────────────────────

/** Payload for a single retry execution job. */
export interface RetryJobData {
  failedPaymentId: string;
  attemptId: string;
  attemptNumber: number;
}

/** Payload for the batch-scan job (finds + enqueues due retries). */
export interface BatchScanJobData {
  triggeredAt: string; // ISO timestamp
  batchSize?: number;
}

/** Payload for a single dunning email job. */
export interface DunningEmailJobData {
  failedPaymentId: string;
  templateId: string;
  sequenceOrder: number;
}

/** Payload for the dunning scan job (finds + enqueues due dunning emails). */
export interface DunningScanJobData {
  triggeredAt: string;
  batchSize?: number;
}
