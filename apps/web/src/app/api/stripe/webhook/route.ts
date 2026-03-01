/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for RecoverHub.
 *
 * Two categories:
 *
 * 1. Connected-account events (Stripe-Account header present):
 *    Fires from users' own Stripe accounts via Stripe Connect.
 *    - invoice.payment_failed     → create failed_payments record + schedule retry
 *    - invoice.payment_succeeded  → mark failed_payment as recovered (if exists)
 *    - customer.subscription.*    → update subscription state (informational)
 *
 * 2. Platform events (no Stripe-Account header):
 *    RecoverHub's own billing.
 *    - customer.subscription.created/updated → update subscriptions table
 *    - customer.subscription.deleted         → downgrade to free
 *    - invoice.payment_failed                → mark subscription past_due
 *    - invoice.payment_succeeded             → re-activate subscription
 *
 * Security: raw body verified via Stripe-Signature (HMAC-SHA256).
 * Idempotency: invoice.payment_failed is deduplicated by stripe_invoice_id.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY                — RecoverHub platform key
 *   STRIPE_WEBHOOK_SECRET            — Signing secret for platform webhook
 *   STRIPE_CONNECT_WEBHOOK_SECRET    — Signing secret for Connect webhook
 */

import { NextRequest, NextResponse } from "next/server";
import {
  db,
  failedPayments,
  retryAttempts,
  subscriptions,
  stripeConnections,
} from "@recoverhub/db";
import { eq, and } from "drizzle-orm";

// ─── Stripe payload types (minimal) ─────────────────────────────────────────

interface StripeInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  status: string;
  amount_due: number;
  currency: string;
  charge: string | null;
  customer_email: string | null;
  customer_name: string | null;
  last_payment_error?: {
    message?: string;
    decline_code?: string;
    code?: string;
  } | null;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number;
  current_period_end: number;
  trial_end: number | null;
  items: { data: Array<{ price: { id: string } }> };
}

interface StripeEvent {
  id: string;
  type: string;
  account?: string;
  data: { object: Record<string, unknown> };
}

// ─── Signature verification ──────────────────────────────────────────────────

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<StripeEvent> {
  const parts = sigHeader.split(",").reduce(
    (acc, part) => {
      const [k, v] = part.split("=");
      if (k === "t") acc.timestamp = v;
      if (k === "v1") acc.signatures.push(v);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );

  if (!parts.timestamp || parts.signatures.length === 0) {
    throw new Error("Invalid Stripe-Signature header");
  }

  const ts = parseInt(parts.timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    throw new Error("Stripe webhook timestamp too old (>5 min)");
  }

  const signedPayload = `${parts.timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );

  const expected = Buffer.from(sigBuffer).toString("hex");

  const isValid = parts.signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    // Timing-safe compare
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  });

  if (!isValid) {
    throw new Error("Stripe webhook signature mismatch");
  }

  return JSON.parse(payload) as StripeEvent;
}

// ─── Helper: 3-day retry schedule ───────────────────────────────────────────

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// ─── Connected-account event handlers ───────────────────────────────────────

/**
 * Handle invoice.payment_failed from a connected Stripe account.
 * Creates a failed_payments record and schedules the first retry attempt.
 * Idempotent: skips if invoice already tracked.
 */
async function handlePaymentFailed(
  stripeAccountId: string,
  invoice: StripeInvoice
): Promise<void> {
  // Look up the stripe connection
  const connection = await db.query.stripeConnections.findFirst({
    where: eq(stripeConnections.stripeAccountId, stripeAccountId),
  });

  if (!connection) {
    console.warn(
      `[webhook] No connection found for stripeAccountId=${stripeAccountId}`
    );
    return;
  }

  // Idempotency check: skip if we already have this invoice
  const existing = await db.query.failedPayments.findFirst({
    where: and(
      eq(failedPayments.stripeConnectionId, connection.id),
      eq(failedPayments.stripeInvoiceId, invoice.id)
    ),
  });

  if (existing) {
    console.log(
      `[webhook] Already tracking invoice ${invoice.id} — skipping`
    );
    return;
  }

  const failureReason =
    invoice.last_payment_error?.message ??
    invoice.last_payment_error?.code ??
    "payment_failed";
  const failureCode =
    invoice.last_payment_error?.decline_code ??
    invoice.last_payment_error?.code ??
    null;

  // Create failed payment record
  const [newFailedPayment] = await db
    .insert(failedPayments)
    .values({
      userId: connection.userId,
      stripeConnectionId: connection.id,
      stripeInvoiceId: invoice.id,
      stripeChargeId: invoice.charge ?? null,
      stripeCustomerId: invoice.customer,
      stripeSubscriptionId: invoice.subscription ?? null,
      customerEmail: invoice.customer_email ?? null,
      customerName: invoice.customer_name ?? null,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      failureReason,
      failureCode,
      status: "active",
      recoveryStartedAt: new Date(),
    })
    .returning({ id: failedPayments.id });

  if (!newFailedPayment) {
    throw new Error("Failed to insert failed_payment record");
  }

  // Schedule first retry attempt (Day 3)
  await db.insert(retryAttempts).values({
    failedPaymentId: newFailedPayment.id,
    attemptNumber: 1,
    scheduledAt: daysFromNow(3),
    status: "pending",
  });

  // TODO (Sprint 2.3): enqueue dunning email job to BullMQ
  // await dunningQueue.add('schedule-dunning-email', {
  //   failedPaymentId: newFailedPayment.id,
  //   day: 1,
  // });

  console.log(
    `[webhook] Created failed_payment ${newFailedPayment.id} for invoice ${invoice.id}`
  );
}

/**
 * Handle invoice.payment_succeeded for a connected account.
 * If we have an active failed_payment for this invoice, mark it as recovered.
 */
async function handlePaymentSucceeded(
  stripeAccountId: string,
  invoice: StripeInvoice
): Promise<void> {
  const connection = await db.query.stripeConnections.findFirst({
    where: eq(stripeConnections.stripeAccountId, stripeAccountId),
  });

  if (!connection) return;

  // Find any active failed payment for this invoice
  const failed = await db.query.failedPayments.findFirst({
    where: and(
      eq(failedPayments.stripeConnectionId, connection.id),
      eq(failedPayments.stripeInvoiceId, invoice.id),
      eq(failedPayments.status, "active")
    ),
  });

  if (failed) {
    await db
      .update(failedPayments)
      .set({
        status: "recovered",
        recoveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(failedPayments.id, failed.id));

    // Cancel all pending retry attempts
    await db
      .update(retryAttempts)
      .set({ status: "skipped" })
      .where(
        and(
          eq(retryAttempts.failedPaymentId, failed.id),
          eq(retryAttempts.status, "pending")
        )
      );

    console.log(
      `[webhook] Marked failed_payment ${failed.id} as recovered`
    );
  }
}

// ─── Platform billing handlers ───────────────────────────────────────────────

function tierFromPriceId(priceId: string): "free" | "starter" | "pro" {
  const starterIds = (process.env.STRIPE_PRICE_STARTER ?? "").split(",");
  const proIds = (process.env.STRIPE_PRICE_PRO ?? "").split(",");
  if (proIds.includes(priceId)) return "pro";
  if (starterIds.includes(priceId)) return "starter";
  return "free";
}

async function handlePlatformSubscriptionUpsert(sub: StripeSubscription) {
  const priceId = sub.items.data[0]?.price?.id ?? "";
  const tier = tierFromPriceId(priceId);

  const mapStatus = (s: string) => {
    if (s === "active") return "active" as const;
    if (s === "canceled") return "canceled" as const;
    if (s === "past_due" || s === "unpaid") return "past_due" as const;
    if (s === "trialing") return "active" as const; // treat trial as active
    return "active" as const;
  };

  await db
    .update(subscriptions)
    .set({
      tier,
      status: mapStatus(sub.status),
      stripeSubscriptionId: sub.id,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, sub.customer));
}

async function handlePlatformSubscriptionDeleted(sub: StripeSubscription) {
  await db
    .update(subscriptions)
    .set({
      tier: "free",
      status: "canceled",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, sub.customer));
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("stripe-signature");

  if (!sigHeader) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature" },
      { status: 400 }
    );
  }

  const connectedAccountId = request.headers.get("stripe-account");
  const isConnectEvent = !!connectedAccountId;

  const secret = isConnectEvent
    ? process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[webhook] Webhook secret not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: StripeEvent;

  try {
    event = await verifyStripeSignature(rawBody, sigHeader, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature error";
    console.error("[webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  console.log(
    `[webhook] ${event.type}${isConnectEvent ? ` (acct: ${connectedAccountId})` : ""}`
  );

  try {
    if (isConnectEvent && connectedAccountId) {
      // ── Connected-account events ─────────────────────────────────────────
      switch (event.type) {
        case "invoice.payment_failed": {
          await handlePaymentFailed(
            connectedAccountId,
            event.data.object as StripeInvoice
          );
          break;
        }
        case "invoice.payment_succeeded": {
          await handlePaymentSucceeded(
            connectedAccountId,
            event.data.object as StripeInvoice
          );
          break;
        }
        default:
          // Log unhandled Connect events (useful for debugging)
          console.log(`[webhook] Unhandled Connect event: ${event.type}`);
      }
    } else {
      // ── Platform billing events ──────────────────────────────────────────
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          await handlePlatformSubscriptionUpsert(
            event.data.object as StripeSubscription
          );
          break;
        }
        case "customer.subscription.deleted": {
          await handlePlatformSubscriptionDeleted(
            event.data.object as StripeSubscription
          );
          break;
        }
        case "invoice.payment_failed": {
          const inv = event.data.object as StripeInvoice;
          await db
            .update(subscriptions)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptions.stripeCustomerId, inv.customer));
          break;
        }
        case "invoice.payment_succeeded": {
          const inv = event.data.object as StripeInvoice;
          await db
            .update(subscriptions)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(subscriptions.stripeCustomerId, inv.customer));
          break;
        }
        default:
          console.log(`[webhook] Unhandled platform event: ${event.type}`);
      }
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    // Return 200 to avoid Stripe immediate retry on DB errors
    return NextResponse.json({
      received: true,
      warning: "Handler error — check server logs",
    });
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
