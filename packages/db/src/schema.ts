import { pgTable, uuid, text, integer, bigint, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'starter', 'pro']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'trialing']);
export const failedPaymentStatusEnum = pgEnum('failed_payment_status', ['active', 'recovered', 'canceled', 'paused']);
export const retryAttemptStatusEnum = pgEnum('retry_attempt_status', ['pending', 'success', 'failed', 'skipped']);
export const dunningEmailStatusEnum = pgEnum('dunning_email_status', ['pending', 'sent', 'failed', 'bounced', 'opened', 'clicked']);

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── stripe_connections ───────────────────────────────────────────────────────
// One user can connect multiple Stripe accounts (agency use case)

export const stripeConnections = pgTable('stripe_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeAccountId: text('stripe_account_id').notNull(), // acct_xxx (OAuth) or direct account
  // AES-256-GCM encrypted access token
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  tokenIv: text('token_iv').notNull(),        // 12-byte base64 IV for GCM
  tokenAuthTag: text('token_auth_tag').notNull(), // 16-byte base64 auth tag
  isLiveMode: boolean('is_live_mode').notNull().default(false),
  accountName: text('account_name'),          // Display name from Stripe account
  connectedAt: timestamp('connected_at').notNull().defaultNow(),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── failed_payments ──────────────────────────────────────────────────────────
// One record per failed Stripe invoice/charge

export const failedPayments = pgTable('failed_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeConnectionId: uuid('stripe_connection_id').notNull().references(() => stripeConnections.id, { onDelete: 'cascade' }),
  stripeInvoiceId: text('stripe_invoice_id'),         // in_xxx
  stripeChargeId: text('stripe_charge_id'),           // ch_xxx (for one-time charges)
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id'), // sub_xxx
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),
  amountCents: integer('amount_cents').notNull(),      // Amount in smallest currency unit
  currency: text('currency').notNull().default('usd'),
  failureReason: text('failure_reason'),               // Human-readable reason
  failureCode: text('failure_code'),                   // Stripe decline code
  status: failedPaymentStatusEnum('status').notNull().default('active'),
  recoveryStartedAt: timestamp('recovery_started_at'),
  recoveredAt: timestamp('recovered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── retry_attempts ───────────────────────────────────────────────────────────
// Individual retry attempts for a failed payment (BullMQ worker executes)

export const retryAttempts = pgTable('retry_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  failedPaymentId: uuid('failed_payment_id').notNull().references(() => failedPayments.id, { onDelete: 'cascade' }),
  attemptNumber: integer('attempt_number').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  attemptedAt: timestamp('attempted_at'),
  status: retryAttemptStatusEnum('status').notNull().default('pending'),
  stripeErrorCode: text('stripe_error_code'),
  stripeErrorMessage: text('stripe_error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── dunning_templates ────────────────────────────────────────────────────────
// Email templates users can configure per dunning step

export const dunningTemplates = pgTable('dunning_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),                       // e.g. "Day 1 Reminder"
  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),              // Plaintext fallback
  delayDays: integer('delay_days').notNull().default(1), // Days after failure to send
  sequenceOrder: integer('sequence_order').notNull(), // 1, 2, 3 in sequence
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── dunning_emails ───────────────────────────────────────────────────────────
// Emails dispatched via Resend for each failed payment

export const dunningEmails = pgTable('dunning_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  failedPaymentId: uuid('failed_payment_id').notNull().references(() => failedPayments.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => dunningTemplates.id, { onDelete: 'set null' }),
  emailTo: text('email_to').notNull(),
  emailSubject: text('email_subject').notNull(),
  resendMessageId: text('resend_message_id'),         // From Resend API response
  status: dunningEmailStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── subscriptions ────────────────────────────────────────────────────────────
// RecoverHub's own Stripe billing for its users

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  tier: subscriptionTierEnum('tier').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── recovery_stats ───────────────────────────────────────────────────────────
// Monthly aggregated stats per Stripe connection (cached for dashboards)

export const recoveryStats = pgTable('recovery_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeConnectionId: uuid('stripe_connection_id').notNull().references(() => stripeConnections.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),                     // Format: "YYYY-MM"
  failedPaymentsCount: integer('failed_payments_count').notNull().default(0),
  recoveredCount: integer('recovered_count').notNull().default(0),
  recoveryRatePct: integer('recovery_rate_pct').notNull().default(0), // 0-100
  recoveredAmountCents: bigint('recovered_amount_cents', { mode: 'number' }).notNull().default(0),
  emailsSentCount: integer('emails_sent_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  stripeConnections: many(stripeConnections),
  failedPayments: many(failedPayments),
  dunningTemplates: many(dunningTemplates),
  subscription: one(subscriptions, { fields: [users.id], references: [subscriptions.userId] }),
}));

export const stripeConnectionsRelations = relations(stripeConnections, ({ one, many }) => ({
  user: one(users, { fields: [stripeConnections.userId], references: [users.id] }),
  failedPayments: many(failedPayments),
  recoveryStats: many(recoveryStats),
}));

export const failedPaymentsRelations = relations(failedPayments, ({ one, many }) => ({
  user: one(users, { fields: [failedPayments.userId], references: [users.id] }),
  stripeConnection: one(stripeConnections, { fields: [failedPayments.stripeConnectionId], references: [stripeConnections.id] }),
  retryAttempts: many(retryAttempts),
  dunningEmails: many(dunningEmails),
}));

export const retryAttemptsRelations = relations(retryAttempts, ({ one }) => ({
  failedPayment: one(failedPayments, { fields: [retryAttempts.failedPaymentId], references: [failedPayments.id] }),
}));

export const dunningTemplatesRelations = relations(dunningTemplates, ({ one, many }) => ({
  user: one(users, { fields: [dunningTemplates.userId], references: [users.id] }),
  dunningEmails: many(dunningEmails),
}));

export const dunningEmailsRelations = relations(dunningEmails, ({ one }) => ({
  failedPayment: one(failedPayments, { fields: [dunningEmails.failedPaymentId], references: [failedPayments.id] }),
  template: one(dunningTemplates, { fields: [dunningEmails.templateId], references: [dunningTemplates.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const recoveryStatsRelations = relations(recoveryStats, ({ one }) => ({
  stripeConnection: one(stripeConnections, { fields: [recoveryStats.stripeConnectionId], references: [stripeConnections.id] }),
}));
