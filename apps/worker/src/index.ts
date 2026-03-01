/**
 * RecoverHub Worker — Entry Point (Sprint 2.3)
 *
 * Starts two BullMQ workers:
 *   - Retry Worker    — processes payment retry batch scans + individual retries
 *   - Dunning Worker  — processes dunning email scans (hourly) + individual emails
 *
 * Environment variables required:
 *   - DATABASE_URL          — PostgreSQL connection string
 *   - ENCRYPTION_KEY        — 32+ char secret for AES-256-GCM
 *   - REDIS_URL             — Redis connection URL (default: redis://localhost:6379)
 *   - RESEND_API_KEY        — Resend API key for dunning emails
 *
 * Optional:
 *   - NODE_ENV              — "production" | "development"
 *   - RESEND_FROM_EMAIL     — Sender address (default: noreply@recoverhub.threestack.io)
 *   - NEXT_PUBLIC_APP_URL   — App URL for billing update links
 */

import { createRetryWorker, createDunningWorker } from "./processor";
import { upsertScheduledJobs, listScheduledJobs } from "./scheduler";
import { redisConnection } from "./queue";

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   RecoverHub Worker  ⚡  Starting...         ║");
  console.log("║   Retry + Dunning Email Engine              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "development"}`);

  // 1. Verify env vars
  const required = ["DATABASE_URL", "ENCRYPTION_KEY", "REDIS_URL", "RESEND_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[startup] ❌ Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // 2. Connect to Redis
  console.log("[startup] Connecting to Redis...");
  await redisConnection.connect();

  // 3. Register scheduled jobs (retry scan + dunning scan)
  console.log("[startup] Registering scheduled jobs...");
  await upsertScheduledJobs();
  await listScheduledJobs();

  // 4. Start retry worker
  console.log("[startup] Starting retry worker...");
  const retryWorker = createRetryWorker();
  await retryWorker.run();

  // 5. Start dunning worker
  console.log("[startup] Starting dunning worker...");
  const dunningWorker = createDunningWorker();
  await dunningWorker.run();

  console.log("[startup] ✅ Workers running — retry + dunning email engine active");

  // ─── Graceful Shutdown ────────────────────────────────────────────────────

  async function shutdown(signal: string) {
    console.log(`\n[shutdown] Received ${signal} — shutting down gracefully...`);

    try {
      await retryWorker.close();
      console.log("[shutdown] Retry worker closed");

      await dunningWorker.close();
      console.log("[shutdown] Dunning worker closed");

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
