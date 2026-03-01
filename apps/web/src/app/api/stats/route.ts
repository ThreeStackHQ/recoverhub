export const dynamic = "force-dynamic";

/**
 * Sprint 2.4 — Recovery Stats API
 * GET /api/stats: aggregated recovery metrics for the authenticated user.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  db,
  failedPayments,
  dunningEmails,
  recoveryStats,
} from "@recoverhub/db";
import { eq, and, sum, count, avg, sql } from "drizzle-orm";
// Note: drizzle-orm helpers are imported directly since @recoverhub/db doesn't re-export them

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Current period totals from failed_payments table (real-time)
    const [totals] = await db
      .select({
        totalFailed: count(failedPayments.id),
        totalRecovered: sum(
          sql<number>`CASE WHEN ${failedPayments.status} = 'recovered' THEN 1 ELSE 0 END`
        ),
        totalRecoveredCents: sum(
          sql<number>`CASE WHEN ${failedPayments.status} = 'recovered' THEN ${failedPayments.amountCents} ELSE 0 END`
        ),
        totalFailedCents: sum(failedPayments.amountCents),
      })
      .from(failedPayments)
      .where(eq(failedPayments.userId, userId));

    // 2. Average recovery time (hours) for recovered payments
    const [recoveryTime] = await db
      .select({
        avgHours: avg(
          sql<number>`EXTRACT(EPOCH FROM (${failedPayments.recoveredAt} - ${failedPayments.createdAt})) / 3600`
        ),
      })
      .from(failedPayments)
      .where(
        and(
          eq(failedPayments.userId, userId),
          sql`${failedPayments.recoveredAt} IS NOT NULL`
        )
      );

    // 3. Emails sent count
    const [emailStats] = await db
      .select({ sent: count(dunningEmails.id) })
      .from(dunningEmails)
      .innerJoin(
        failedPayments,
        eq(dunningEmails.failedPaymentId, failedPayments.id)
      )
      .where(eq(failedPayments.userId, userId));

    // 4. Monthly stats from recovery_stats (historical view)
    const monthlyStats = await db
      .select()
      .from(recoveryStats)
      .where(
        sql`${recoveryStats.stripeConnectionId} IN (
          SELECT id FROM stripe_connections WHERE user_id = ${userId}
        )`
      )
      .orderBy(sql`${recoveryStats.month} DESC`)
      .limit(12);

    const totalFailed = Number(totals?.totalFailed ?? 0);
    const totalRecovered = Number(totals?.totalRecovered ?? 0);
    const successRate = totalFailed > 0 ? Math.round((totalRecovered / totalFailed) * 100) : 0;

    return NextResponse.json({
      // Real-time aggregates
      total_failed: totalFailed,
      total_recovered: totalRecovered,
      success_rate_pct: successRate,
      total_recovered_mrr: totalRecovered > 0 ? (Number(totals?.totalRecoveredCents ?? 0) / 100).toFixed(2) : "0.00",
      total_at_risk_mrr: ((Number(totals?.totalFailedCents ?? 0) - Number(totals?.totalRecoveredCents ?? 0)) / 100).toFixed(2),
      avg_recovery_time_hours: recoveryTime?.avgHours ? Number(Number(recoveryTime.avgHours).toFixed(1)) : null,
      emails_sent: Number(emailStats?.sent ?? 0),
      // Historical monthly breakdown
      monthly: monthlyStats.map((m) => ({
        month: m.month,
        failed: m.failedPaymentsCount,
        recovered: m.recoveredCount,
        recovery_rate_pct: m.recoveryRatePct,
        recovered_mrr: (m.recoveredAmountCents / 100).toFixed(2),
        emails_sent: m.emailsSentCount,
      })),
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
