export const dynamic = "force-dynamic";

/**
 * Resend webhook handler for email events (opens, clicks, bounces).
 * Tracks status in dunning_emails table.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, dunningEmails } from "@recoverhub/db";
import { eq } from "drizzle-orm";
// eq is imported from drizzle-orm directly since @recoverhub/db doesn't re-export it

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  // Verify webhook signature (optional — Resend uses basic HTTPS + signing secret)
  const signingSecret = process.env["RESEND_WEBHOOK_SECRET"];
  if (signingSecret) {
    const signature = req.headers.get("svix-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // In production, verify the signature using svix SDK or manual HMAC
    // For now, accept all requests if no signing secret is configured
  }

  try {
    const event = (await req.json()) as ResendWebhookEvent;
    const { type, data } = event;

    if (!data?.email_id) {
      return NextResponse.json({ ok: true });
    }

    // Find dunning email by resend message ID
    const [dunningEmail] = await db
      .select({ id: dunningEmails.id, status: dunningEmails.status })
      .from(dunningEmails)
      .where(eq(dunningEmails.resendMessageId, data.email_id))
      .limit(1);

    if (!dunningEmail) {
      // Not a tracked dunning email
      return NextResponse.json({ ok: true });
    }

    const now = new Date();

    switch (type) {
      case "email.opened":
        await db
          .update(dunningEmails)
          .set({ status: "opened", openedAt: now })
          .where(eq(dunningEmails.id, dunningEmail.id));
        break;

      case "email.clicked":
        await db
          .update(dunningEmails)
          .set({ status: "clicked", clickedAt: now })
          .where(eq(dunningEmails.id, dunningEmail.id));
        break;

      case "email.bounced":
      case "email.complained":
        await db
          .update(dunningEmails)
          .set({ status: "bounced" })
          .where(eq(dunningEmails.id, dunningEmail.id));
        break;

      default:
        // Unhandled event type — just log
        console.info(`[resend-webhook] Unhandled event: ${type}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[resend-webhook] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
