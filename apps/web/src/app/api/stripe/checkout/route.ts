/**
 * Sprint 2.6 — Stripe Billing Integration
 *
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for RecoverHub's own subscription plans.
 * Returns { url } for client-side redirect.
 *
 * Plans:
 *   - starter  → Pro       $19/mo  (priceId: STRIPE_PRICE_STARTER)
 *   - pro      → Business  $49/mo  (priceId: STRIPE_PRICE_PRO)
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — RecoverHub platform secret key
 *   STRIPE_PRICE_STARTER   — Stripe Price ID for $19/mo plan
 *   STRIPE_PRICE_PRO       — Stripe Price ID for $49/mo plan
 *   NEXT_PUBLIC_APP_URL    — App base URL (for success/cancel redirects)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { db, subscriptions, users } from "@recoverhub/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

// ─── Stripe Client ────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

// ─── Request Schema ────────────────────────────────────────────────────────────

const CheckoutBodySchema = z.object({
  plan: z.enum(["starter", "pro"]),
});

// ─── Plan Config ──────────────────────────────────────────────────────────────

const PLAN_CONFIG = {
  starter: {
    name: "Pro",
    priceEnvVar: "STRIPE_PRICE_STARTER",
    amount: "$19/mo",
  },
  pro: {
    name: "Business",
    priceEnvVar: "STRIPE_PRICE_PRO",
    amount: "$49/mo",
  },
} as const;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CheckoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan. Must be 'starter' or 'pro'" },
      { status: 400 }
    );
  }

  const { plan } = parsed.data;
  const planConfig = PLAN_CONFIG[plan];
  const priceId = process.env[planConfig.priceEnvVar];

  if (!priceId) {
    return NextResponse.json(
      { error: `${planConfig.priceEnvVar} not configured` },
      { status: 500 }
    );
  }

  const appUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://app.recoverhub.threestack.io";

  // 3. Load user details
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Check for existing subscription record (get or create Stripe customer ID)
  let stripeCustomerId: string | undefined;

  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  if (existingSub?.stripeCustomerId) {
    stripeCustomerId = existingSub.stripeCustomerId;

    // If already on this plan, return portal URL instead
    if (existingSub.tier === plan && existingSub.status === "active") {
      try {
        const stripe = getStripe();
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${appUrl}/settings/billing`,
        });
        return NextResponse.json({ url: portalSession.url, type: "portal" });
      } catch {
        // Fall through to checkout if portal fails
      }
    }
  }

  // 5. Create Stripe Checkout Session
  try {
    const stripe = getStripe();

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings/billing?success=1&plan=${plan}`,
      cancel_url: `${appUrl}/settings/billing?canceled=1`,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          plan,
        },
      },
    };

    // Attach to existing Stripe customer if we have one
    if (stripeCustomerId) {
      checkoutParams.customer = stripeCustomerId;
    } else {
      // Pre-fill email for new customer
      checkoutParams.customer_email = user.email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    // 6. Upsert subscriptions record (mark as pending until webhook confirms)
    if (existingSub) {
      await db
        .update(subscriptions)
        .set({ tier: plan, updatedAt: new Date() })
        .where(eq(subscriptions.userId, session.user.id));
    } else {
      await db.insert(subscriptions).values({
        userId: session.user.id,
        tier: "free", // Will be updated by webhook on success
        status: "active",
        stripeCustomerId: checkoutSession.customer as string | undefined,
      }).onConflictDoNothing();
    }

    return NextResponse.json({ url: checkoutSession.url, type: "checkout" });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[checkout] Stripe error: ${errMsg}`);
    return NextResponse.json(
      { error: "Failed to create checkout session", details: errMsg },
      { status: 500 }
    );
  }
}
