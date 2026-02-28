// Re-export everything for consumers
export { db, sql } from './client';
export * from './schema';

// Type helpers derived from schema
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  users,
  stripeConnections,
  failedPayments,
  retryAttempts,
  dunningTemplates,
  dunningEmails,
  subscriptions,
  recoveryStats,
} from './schema';

// Select types (returned from DB)
export type User = InferSelectModel<typeof users>;
export type StripeConnection = InferSelectModel<typeof stripeConnections>;
export type FailedPayment = InferSelectModel<typeof failedPayments>;
export type RetryAttempt = InferSelectModel<typeof retryAttempts>;
export type DunningTemplate = InferSelectModel<typeof dunningTemplates>;
export type DunningEmail = InferSelectModel<typeof dunningEmails>;
export type Subscription = InferSelectModel<typeof subscriptions>;
export type RecoveryStat = InferSelectModel<typeof recoveryStats>;

// Insert types (for creating records)
export type NewUser = InferInsertModel<typeof users>;
export type NewStripeConnection = InferInsertModel<typeof stripeConnections>;
export type NewFailedPayment = InferInsertModel<typeof failedPayments>;
export type NewRetryAttempt = InferInsertModel<typeof retryAttempts>;
export type NewDunningTemplate = InferInsertModel<typeof dunningTemplates>;
export type NewDunningEmail = InferInsertModel<typeof dunningEmails>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type NewRecoveryStat = InferInsertModel<typeof recoveryStats>;
