/**
 * Sprint 1.12 — Queue Client for Web App
 *
 * Allows API routes to enqueue jobs into the BullMQ retry-queue and dunning-queue
 * without starting a worker. Uses the same Redis connection as the worker.
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { ConnectionOptions } from "bullmq";

// ─── Redis Connection (lazy) ──────────────────────────────────────────────────

let _redis: IORedis | null = null;

function getRedis(): IORedis {
  if (_redis && _redis.status === "ready") return _redis;
  const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  _redis = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  _redis.on("error", (err: Error) => {
    console.error("[queue-client] Redis error:", err.message);
  });
  return _redis;
}

function getConnection(): ConnectionOptions {
  return getRedis() as unknown as ConnectionOptions;
}

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const RETRY_QUEUE_NAME = "retry-queue";

// ─── Job Data Types ───────────────────────────────────────────────────────────

export interface RetryJobData {
  failedPaymentId: string;
  attemptId: string;
  attemptNumber: number;
}

// ─── Lazy Queue ───────────────────────────────────────────────────────────────

let _retryQueue: Queue<RetryJobData> | null = null;

export function getRetryQueue(): Queue<RetryJobData> {
  if (_retryQueue) return _retryQueue;
  _retryQueue = new Queue<RetryJobData>(RETRY_QUEUE_NAME, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
  return _retryQueue;
}
