/**
 * Sprint 2.1 — Default Dunning Email Templates
 *
 * 3 templates: Soft Reminder (Day 1), Urgent Notice (Day 5), Final Warning (Day 12).
 * Seeded on user signup. Variables: {{customer_name}}, {{amount_due}}, {{update_link}}
 */

export interface DunningTemplateData {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  delayDays: number;
  sequenceOrder: number;
}

const APP_NAME = "RecoverHub";

export const DEFAULT_TEMPLATES: DunningTemplateData[] = [
  {
    name: "Soft Reminder",
    sequenceOrder: 1,
    delayDays: 1,
    subject: "Action required: Update your payment details",
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Update Required</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#4f46e5;padding:32px 40px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${APP_NAME}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="font-size:16px;color:#111;margin-top:0;">Hi {{customer_name}},</p>
          <p style="font-size:15px;color:#374151;line-height:1.6;">
            We noticed there was an issue processing your recent payment of <strong>{{amount_due}}</strong>.
            This can happen when a card expires, has insufficient funds, or your bank declines the transaction.
          </p>
          <p style="font-size:15px;color:#374151;line-height:1.6;">
            Your account is still active. Please update your payment details at your earliest convenience.
          </p>
          <a href="{{update_link}}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin:16px 0;">
            Update Payment Details
          </a>
          <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
            If you have any questions, reply to this email and we'll be happy to help.
          </p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:20px 40px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            You're receiving this because your payment couldn't be processed.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    bodyText: `Hi {{customer_name}},

We noticed there was an issue processing your recent payment of {{amount_due}}.

Please update your payment details: {{update_link}}

Your account is still active. If you have any questions, reply to this email.`,
  },

  {
    name: "Urgent Notice",
    sequenceOrder: 2,
    delayDays: 5,
    subject: "Urgent: Your payment of {{amount_due}} is still outstanding",
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Urgent: Payment Outstanding</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#dc2626;padding:32px 40px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${APP_NAME}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="font-size:16px;color:#111;margin-top:0;">Hi {{customer_name}},</p>
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">⚠️ Your payment of {{amount_due}} is 5 days overdue.</p>
          </div>
          <p style="font-size:15px;color:#374151;line-height:1.6;">
            We've been unable to collect payment on your account. To keep your subscription active and avoid any service interruption, please update your payment information immediately.
          </p>
          <a href="{{update_link}}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin:16px 0;">
            Update Payment Now
          </a>
          <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
            Need help? Reply to this email or contact our support team.
          </p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:20px 40px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            Your subscription may be suspended if payment is not received.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    bodyText: `Hi {{customer_name}},

URGENT: Your payment of {{amount_due}} is 5 days overdue.

Please update your payment immediately to avoid service interruption: {{update_link}}

Need help? Reply to this email.`,
  },

  {
    name: "Final Warning",
    sequenceOrder: 3,
    delayDays: 12,
    subject: "Final notice: Subscription cancellation in 48 hours",
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Final Notice: Subscription Cancellation</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#7c3aed;padding:32px 40px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${APP_NAME}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="font-size:16px;color:#111;margin-top:0;">Hi {{customer_name}},</p>
          <div style="background:#faf5ff;border:1px solid #7c3aed;padding:16px;border-radius:6px;margin-bottom:24px;text-align:center;">
            <p style="margin:0;font-size:18px;color:#6d28d9;font-weight:700;">⏰ 48 hours until cancellation</p>
          </div>
          <p style="font-size:15px;color:#374151;line-height:1.6;">
            This is your final notice. Your outstanding payment of <strong>{{amount_due}}</strong> has not been received, and your subscription will be <strong>automatically cancelled in 48 hours</strong>.
          </p>
          <p style="font-size:15px;color:#374151;line-height:1.6;">
            Don't lose your data and access. Update your payment details now to keep everything intact.
          </p>
          <a href="{{update_link}}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700;margin:16px 0;">
            Keep My Subscription Active →
          </a>
          <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
            If you believe this is an error or have questions, please contact us immediately.
          </p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:20px 40px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            After cancellation, your data will be retained for 30 days.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    bodyText: `Hi {{customer_name}},

FINAL NOTICE: Your subscription will be cancelled in 48 hours.

Outstanding payment: {{amount_due}}

Update your payment to prevent cancellation: {{update_link}}

Data retained for 30 days after cancellation.`,
  },
];

/**
 * Replace template variables with actual values.
 */
export function renderTemplate(
  template: string,
  vars: {
    customer_name: string;
    amount_due: string;
    update_link: string;
  }
): string {
  return template
    .replace(/\{\{customer_name\}\}/g, vars.customer_name)
    .replace(/\{\{amount_due\}\}/g, vars.amount_due)
    .replace(/\{\{update_link\}\}/g, vars.update_link);
}
