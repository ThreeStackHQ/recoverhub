/**
 * Sprint 2.2 — Resend Email Integration
 * lib/email-client.ts: send dunning emails via Resend, track in DB.
 */

import { Resend } from "resend";
import { db, dunningEmails, dunningTemplates } from "@recoverhub/db";
import { eq } from "drizzle-orm";
import { renderTemplate } from "./dunning-templates";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  _resend = new Resend(apiKey);
  return _resend;
}

const FROM_EMAIL =
  process.env["RESEND_FROM_EMAIL"] ?? "RecoverHub <noreply@recoverhub.threestack.io>";

export interface SendDunningEmailOptions {
  failedPaymentId: string;
  templateId: string;
  customerEmail: string;
  customerName: string;
  amountDue: string;   // Formatted: "$29.00"
  updateLink: string;  // Stripe billing portal or update URL
}

export interface SendDunningEmailResult {
  success: boolean;
  dunningEmailId?: string;
  resendMessageId?: string;
  error?: string;
}

/**
 * Send a dunning email to a customer and log it to the dunning_emails table.
 */
export async function sendDunningEmail(
  opts: SendDunningEmailOptions
): Promise<SendDunningEmailResult> {
  // Load template
  const [template] = await db
    .select()
    .from(dunningTemplates)
    .where(eq(dunningTemplates.id, opts.templateId))
    .limit(1);

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Render template variables
  const vars = {
    customer_name: opts.customerName || opts.customerEmail,
    amount_due: opts.amountDue,
    update_link: opts.updateLink,
  };

  const subject = renderTemplate(template.subject, vars);
  const htmlBody = renderTemplate(template.bodyHtml, vars);
  const textBody = renderTemplate(template.bodyText, vars);

  // Insert dunning_emails record (pending)
  const [dunningEmail] = await db
    .insert(dunningEmails)
    .values({
      failedPaymentId: opts.failedPaymentId,
      templateId: opts.templateId,
      emailTo: opts.customerEmail,
      emailSubject: subject,
      status: "pending",
    })
    .returning();

  if (!dunningEmail) {
    return { success: false, error: "Failed to create dunning email record" };
  }

  // Send via Resend
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.customerEmail,
      subject,
      html: htmlBody,
      text: textBody,
      tags: [
        { name: "type", value: "dunning" },
        { name: "template", value: template.name },
        { name: "failed_payment_id", value: opts.failedPaymentId },
      ],
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Resend returned no data");
    }

    // Update record with success
    await db
      .update(dunningEmails)
      .set({
        status: "sent",
        resendMessageId: data.id,
        sentAt: new Date(),
      })
      .where(eq(dunningEmails.id, dunningEmail.id));

    return {
      success: true,
      dunningEmailId: dunningEmail.id,
      resendMessageId: data.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[email-client] send failed:", err);

    // Update record with failure
    await db
      .update(dunningEmails)
      .set({ status: "failed" })
      .where(eq(dunningEmails.id, dunningEmail.id));

    return {
      success: false,
      dunningEmailId: dunningEmail.id,
      error: errorMsg,
    };
  }
}
