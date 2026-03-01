/**
 * RecoverHub Worker — Entry Point
 *
 * Starts the BullMQ worker and schedules the 6-hour retry scan.
 *
 * Environment variables required:
 *   - DATABASE_URL          — PostgreSQL connection string
 *   - ENCRYPTION_KEY        — 32+ char secret for AES-256-GCM
 *   - REDIS_URL             — Redis connection URL (default: redis://localhost:6379)
 *
 * Optional:
 *   - NODE_ENV              — "production" | "development"
 */

import { createRetryWorker } from "./processor";
import { upsertScheduledJobs, listScheduledJobs } from "./scheduler";
import { redisConnection } from "./queue";

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   RecoverHub Worker  ⚡ Starting...  ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "development"}`);

  // 1. Verify env vars
  const required = ["DATABASE_URL", "ENCRYPTION_KEY", "REDIS_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[startup] ❌ Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // 2. Connect to Redis
  console.log("[startup] Connecting to Redis...");
  await redisConnection.connect();

  // 3. Register scheduled jobs
  console.log("[startup] Registering scheduled jobs...");
  await upsertScheduledJobs();
  await listScheduledJobs();

  // 4. Start the worker
  console.log("[startup] Starting retry worker...");
  const worker = createRetryWorker();
  await worker.run();

  console.log("[startup] ✅ Worker running — waiting for jobs...");

  // ─── Graceful Shutdown ────────────────────────────────────────────────────

  async function shutdown(signal: string) {
    console.log(`\n[shutdown] Received ${signal} — shutting down gracefully...`);

    try {
      await worker.close();
      console.log("[shutdown] Worker closed");

      await redisConnection.quit();
      console.log("[shutdown] Redis disconnected");
    } catch (err) {
      console.error("[shutdown] Error during shutdown:", err);
    }

    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[fatal] Unhandled error:", err);
  process.exit(1);
});
