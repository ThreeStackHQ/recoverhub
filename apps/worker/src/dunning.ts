/**
 * RecoverHub Worker — Dunning Email Logic (Sprint 2.3)
 *
 * - fetchDueDunningEmails(): find failed payments + next template to send
 * - executeDunningEmail(): send via Resend, log to dunning_emails
 * - scheduleNextDunningEmail(): enqueue next email in sequence (or stop)
 */

import { Resend } from "resend";
import {
  db,
  failedPayments,
  dunningTemplates,
  dunningEmails,
} from "@recoverhub/db";
import { eq, and, sql } from "drizzle-orm";
import { dunningQueue, type DunningEmailJobData } from "./queue";

// ─── Resend Client ────────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  _resend = new Resend(apiKey);
  return _resend;
}

const FROM_EMAIL =
  process.env["RESEND_FROM_EMAIL"] ??
  "RecoverHub <noreply@recoverhub.threestack.io>";

// ─── Template Variable Renderer ───────────────────────────────────────────────

function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DueDunningEmail {
  failedPaymentId: string;
  templateId: string;
  sequenceOrder: number;
  customerEmail: string;
  customerName: string | null;
  amountCents: number;
  currency: string;
  userId: string;
}

// ─── Fetch Due Dunning Emails ─────────────────────────────────────────────────

/**
 * Returns failed payments that have a dunning template step due to be sent.
 *
 * Logic per active failed_payment:
 *   1. Find all templates belonging to the payment owner (ordered by sequenceOrder)
 *   2. Find which template step has never been sent for this payment
 *      AND the required delay has passed (failedAt + delayDays <= now)
 *   3. Return the FIRST unsent template that is due
 *
 * Skips payments that already have a sent/pending email for the next sequence step.
 */
export async function fetchDueDunningEmails(
  batchSize = 50
): Promise<DueDunningEmail[]> {
  const now = new Date();

  // Fetch all active failed payments with customer email
  const activepayments = await db
    .select()
    .from(failedPayments)
    .where(
      and(
        eq(failedPayments.status, "active"),
        sql`${failedPayments.customerEmail} IS NOT NULL`
      )
    )
    .limit(batchSize);

  const due: DueDunningEmail[] = [];

  for (const payment of activepayments) {
    if (!payment.customerEmail) continue;

    // Fetch this user's active dunning templates (ordered by sequence)
    const templates = await db
      .select()
      .from(dunningTemplates)
      .where(
        and(
          eq(dunningTemplates.userId, payment.userId),
          eq(dunningTemplates.isActive, true)
        )
      )
      .orderBy(dunningTemplates.sequenceOrder);

    if (templates.length === 0) continue;

    // Fetch all dunning emails already sent for this payment
    const sentEmails = await db
      .select({
        templateId: dunningEmails.templateId,
        status: dunningEmails.status,
      })
      .from(dunningEmails)
      .where(eq(dunningEmails.failedPaymentId, payment.id));

    const sentTemplateIds = new Set(
      sentEmails.map((e) => e.templateId).filter(Boolean)
    );

    // Find the first template in sequence that hasn't been sent and is due
    for (const template of templates) {
      if (sentTemplateIds.has(template.id)) continue; // already sent

      // Check if enough time has passed: createdAt + delayDays <= now
      const sendAfter = new Date(payment.createdAt);
      sendAfter.setDate(sendAfter.getDate() + template.delayDays);

      if (now >= sendAfter) {
        due.push({
          failedPaymentId: payment.id,
          templateId: template.id,
          sequenceOrder: template.sequenceOrder,
          customerEmail: payment.customerEmail,
          customerName: payment.customerName,
          amountCents: payment.amountCents,
          currency: payment.currency,
          userId: payment.userId,
        });
        // Only send one email per payment per scan (lowest due sequence step)
        break;
      }
    }
  }

  return due;
}

// ─── Execute Dunning Email ────────────────────────────────────────────────────

export interface DunningEmailResult {
  success: boolean;
  dunningEmailId?: string;
  resendMessageId?: string;
  error?: string;
}

/**
 * Sends a dunning email for a specific failed payment + template.
 * Logs result to dunning_emails table.
 */
export async function executeDunningEmail(
  jobData: DunningEmailJobData
): Promise<DunningEmailResult> {
  const { failedPaymentId, templateId } = jobData;

  // Load payment
  const [payment] = await db
    .select()
    .from(failedPayments)
    .where(eq(failedPayments.id, failedPaymentId))
    .limit(1);

  if (!payment) {
    return { success: false, error: "Failed payment not found" };
  }

  // Payment already recovered — skip
  if (payment.status !== "active") {
    console.log(
      `[dunning] Payment ${failedPaymentId} is ${payment.status} — skipping email`
    );
    return { success: true, dunningEmailId: undefined };
  }

  if (!payment.customerEmail) {
    return { success: false, error: "No customer email on payment" };
  }

  // Load template
  const [template] = await db
    .select()
    .from(dunningTemplates)
    .where(eq(dunningTemplates.id, templateId))
    .limit(1);

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Format amount
  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payment.currency.toUpperCase(),
  }).format(payment.amountCents / 100);

  // Build update link (Stripe billing portal placeholder)
  const appUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://app.recoverhub.threestack.io";
  const updateLink = `${appUrl}/billing/update`;

  // Render template
  const vars = {
    customer_name: payment.customerName || payment.customerEmail,
    amount_due: amountFormatted,
    update_link: updateLink,
  };

  const subject = renderTemplate(template.subject, vars);
  const htmlBody = renderTemplate(template.bodyHtml, vars);
  const textBody = renderTemplate(template.bodyText, vars);

  // Insert dunning_emails record (pending)
  const [dunningEmail] = await db
    .insert(dunningEmails)
    .values({
      failedPaymentId,
      templateId,
      emailTo: payment.customerEmail,
      emailSubject: subject,
      status: "pending",
    })
    .returning();

  if (!dunningEmail) {
    return { success: false, error: "Failed to create dunning_emails record" };
  }

  // Send via Resend
  try {
    const resend = getResend();
    const { data, error: resendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: payment.customerEmail,
      subject,
      html: htmlBody,
      text: textBody,
      tags: [
        { name: "type", value: "dunning" },
        { name: "template_id", value: templateId },
        { name: "failed_payment_id", value: failedPaymentId },
      ],
    });

    if (resendError || !data) {
      // Mark as failed
      await db
        .update(dunningEmails)
        .set({ status: "failed" })
        .where(eq(dunningEmails.id, dunningEmail.id));

      const errMsg = resendError?.message ?? "Unknown Resend error";
      console.error(`[dunning] Resend error for ${failedPaymentId}: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    // Mark as sent, store resend message ID
    await db
      .update(dunningEmails)
      .set({
        status: "sent",
        resendMessageId: data.id,
        sentAt: new Date(),
      })
      .where(eq(dunningEmails.id, dunningEmail.id));

    console.log(
      `[dunning] ✅ Sent email to ${payment.customerEmail} (template: ${template.name}, msgId: ${data.id})`
    );

    // Schedule next email in sequence (if any)
    await scheduleNextDunningEmail(
      failedPaymentId,
      payment.userId,
      jobData.sequenceOrder
    );

    return {
      success: true,
      dunningEmailId: dunningEmail.id,
      resendMessageId: data.id,
    };
  } catch (err) {
    await db
      .update(dunningEmails)
      .set({ status: "failed" })
      .where(eq(dunningEmails.id, dunningEmail.id));

    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[dunning] Exception for ${failedPaymentId}: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

// ─── Schedule Next Dunning Email ──────────────────────────────────────────────

/**
 * After sending sequence step N, looks up step N+1 and enqueues it
 * with a delay matching the template's delayDays relative to payment creation.
 *
 * If no next template exists, the dunning sequence is complete.
 */
async function scheduleNextDunningEmail(
  failedPaymentId: string,
  userId: string,
  currentSequenceOrder: number
): Promise<void> {
  // Check payment still active
  const [payment] = await db
    .select({ status: failedPayments.status, createdAt: failedPayments.createdAt })
    .from(failedPayments)
    .where(eq(failedPayments.id, failedPaymentId))
    .limit(1);

  if (!payment || payment.status !== "active") {
    console.log(
      `[dunning] Payment ${failedPaymentId} not active — no next step scheduled`
    );
    return;
  }

  // Find next template in sequence
  const [nextTemplate] = await db
    .select()
    .from(dunningTemplates)
    .where(
      and(
        eq(dunningTemplates.userId, userId),
        eq(dunningTemplates.isActive, true),
        sql`${dunningTemplates.sequenceOrder} > ${currentSequenceOrder}`
      )
    )
    .orderBy(dunningTemplates.sequenceOrder)
    .limit(1);

  if (!nextTemplate) {
    console.log(
      `[dunning] No next template for payment ${failedPaymentId} after sequence ${currentSequenceOrder}`
    );
    return;
  }

  // Calculate delay: next sendAt = payment.createdAt + nextTemplate.delayDays
  const sendAt = new Date(payment.createdAt);
  sendAt.setDate(sendAt.getDate() + nextTemplate.delayDays);
  const delayMs = Math.max(0, sendAt.getTime() - Date.now());

  // Enqueue next dunning email job
  const jobData: DunningEmailJobData = {
    failedPaymentId,
    templateId: nextTemplate.id,
    sequenceOrder: nextTemplate.sequenceOrder,
  };

  await dunningQueue.add("dunning-email", jobData, {
    delay: delayMs,
    jobId: `dunning:${failedPaymentId}:seq${nextTemplate.sequenceOrder}`,
  });

  const sendAtStr = sendAt.toISOString();
  console.log(
    `[dunning] ⏰ Scheduled sequence step ${nextTemplate.sequenceOrder} for payment ${failedPaymentId} at ${sendAtStr} (delay: ${Math.round(delayMs / 3_600_000)}h)`
  );
}
