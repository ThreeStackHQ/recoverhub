import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AlertCircle, RefreshCw, TrendingUp, DollarSign, Clock, CheckCircle2, XCircle, MailOpen, MoreHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: React.ElementType;
  accent?: boolean;
}

// ─── Mock data (Sprint 2.5 – UI only, DB integration in Sprint 3.x) ──────────

const MOCK_FAILED_PAYMENTS = [
  {
    id: "fp_001",
    customer: "Acme Corp",
    email: "billing@acme.com",
    amount: "$299.00",
    plan: "Pro Annual",
    failedAt: "2 minutes ago",
    failureReason: "Card declined",
    retries: 0,
    status: "new" as const,
  },
  {
    id: "fp_002",
    customer: "Startup Labs",
    email: "founders@startuplabs.io",
    amount: "$49.00",
    plan: "Starter Monthly",
    failedAt: "1 hour ago",
    failureReason: "Insufficient funds",
    retries: 1,
    status: "retrying" as const,
  },
  {
    id: "fp_003",
    customer: "DesignCo",
    email: "finance@designco.com",
    amount: "$149.00",
    plan: "Pro Monthly",
    failedAt: "3 hours ago",
    failureReason: "Card expired",
    retries: 2,
    status: "retrying" as const,
  },
  {
    id: "fp_004",
    customer: "TechFlow Inc",
    email: "ops@techflow.com",
    amount: "$599.00",
    plan: "Business Annual",
    failedAt: "1 day ago",
    failureReason: "Do not honor",
    retries: 3,
    status: "dunning" as const,
  },
  {
    id: "fp_005",
    customer: "SimpleApp",
    email: "hello@simpleapp.co",
    amount: "$19.00",
    plan: "Basic Monthly",
    failedAt: "2 days ago",
    failureReason: "Card declined",
    retries: 2,
    status: "recovered" as const,
  },
];

const MOCK_RETRY_TIMELINE = [
  { time: "2 min ago", event: "Payment failed", customer: "Acme Corp", amount: "$299.00", type: "failed" },
  { time: "58 min ago", event: "Retry scheduled (attempt 2)", customer: "DesignCo", amount: "$149.00", type: "scheduled" },
  { time: "1 hr ago", event: "Payment failed", customer: "Startup Labs", amount: "$49.00", type: "failed" },
  { time: "2 hrs ago", event: "Dunning email sent", customer: "TechFlow Inc", amount: "$599.00", type: "email" },
  { time: "4 hrs ago", event: "Payment recovered ✓", customer: "SimpleApp", amount: "$19.00", type: "recovered" },
  { time: "6 hrs ago", event: "Retry attempt 1 failed", customer: "DesignCo", amount: "$149.00", type: "failed" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, change, positive, icon: Icon, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-[#ef4343]/30 bg-[#ef4343]/5" : "border-white/[0.08] bg-[#131829]"}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#8892A7] uppercase tracking-wide">{label}</p>
        <div className={`p-2 rounded-lg ${accent ? "bg-[#ef4343]/20" : "bg-white/5"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-[#ef4343]" : "text-[#8892A7]"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-[#ef4343]" : "text-white"}`}>{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${positive ? "text-green-400" : "text-red-400"}`}>
          {change}
        </p>
      )}
    </div>
  );
}

type FailedPaymentStatus = "new" | "retrying" | "dunning" | "recovered" | "failed";

function StatusBadge({ status }: { status: FailedPaymentStatus }) {
  const config = {
    new: { label: "New", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    retrying: { label: "Retrying", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    dunning: { label: "Dunning", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    recovered: { label: "Recovered", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
    failed: { label: "Failed", cls: "bg-red-500/10 text-[#ef4343] border-[#ef4343]/20" },
  }[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}>
      {config.label}
    </span>
  );
}

function TimelineDot({ type }: { type: string }) {
  const config: Record<string, string> = {
    failed: "bg-[#ef4343]",
    scheduled: "bg-amber-400",
    email: "bg-purple-400",
    recovered: "bg-green-400",
  };
  return <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${config[type] ?? "bg-gray-500"}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const recoveredMRR = "$1,247";
  const successRate = "68%";
  const activeRetries = 3;
  const atRiskMRR = "$1,096";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8892A7]">
            Welcome back, {session.user?.name ?? session.user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/connections"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-[#8892A7] hover:text-white hover:bg-white/5 transition"
          >
            <RefreshCw className="h-3 w-3" />
            Sync Stripe
          </a>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recovered MRR" value={recoveredMRR} change="+$412 this month" positive icon={DollarSign} accent />
        <StatCard label="Success Rate" value={successRate} change="+5% vs last month" positive icon={TrendingUp} />
        <StatCard label="Active Retries" value={String(activeRetries)} icon={RefreshCw} />
        <StatCard label="At-Risk MRR" value={atRiskMRR} change="3 dunning sequences" icon={AlertCircle} />
      </div>

      {/* Content grid: failed payments + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failed payments table (2/3) */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#131829] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Failed Payments</h2>
            <a href="/failed-payments" className="text-xs text-[#8892A7] hover:text-white transition">
              View all →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8892A7]">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8892A7]">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8892A7]">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8892A7]">Failed</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8892A7]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_FAILED_PAYMENTS.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-white text-sm">{payment.customer}</p>
                        <p className="text-xs text-[#8892A7] mt-0.5">{payment.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-white">{payment.amount}</p>
                        <p className="text-xs text-[#8892A7]">{payment.plan}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-[#8892A7] text-xs">{payment.failedAt}</p>
                        <p className="text-xs text-[#8892A7]/60 mt-0.5">{payment.failureReason}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {payment.status !== "recovered" && (
                          <>
                            <button
                              className="p-1.5 rounded-md hover:bg-white/10 text-[#8892A7] hover:text-white transition"
                              title="Retry now"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-white/10 text-[#8892A7] hover:text-white transition"
                              title="Send dunning email"
                            >
                              <MailOpen className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-white/10 text-[#8892A7] hover:text-white transition"
                              title="Mark resolved"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {payment.status === "recovered" && (
                          <XCircle className="h-3.5 w-3.5 text-green-400 ml-1" />
                        )}
                        <button
                          className="p-1.5 rounded-md hover:bg-white/10 text-[#8892A7] hover:text-white transition"
                          title="More options"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Retry Timeline (1/3) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#131829] p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">Activity</h2>
            <Clock className="h-4 w-4 text-[#8892A7]" />
          </div>

          <div className="space-y-4">
            {MOCK_RETRY_TIMELINE.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <TimelineDot type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white leading-tight">{item.event}</p>
                  <p className="text-xs text-[#8892A7] mt-0.5 truncate">{item.customer} · {item.amount}</p>
                  <p className="text-[10px] text-[#8892A7]/50 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="/retries"
            className="mt-5 block text-center text-xs text-[#8892A7] hover:text-white transition"
          >
            View full retry queue →
          </a>
        </div>
      </div>

      {/* Connect Stripe prompt (if not connected) */}
      <div className="p-5 rounded-xl border border-white/[0.08] bg-[#131829] flex items-center gap-4">
        <div className="p-3 rounded-xl bg-[#ef4343]/10 border border-[#ef4343]/20">
          <AlertCircle className="h-5 w-5 text-[#ef4343]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Connect your Stripe account</p>
          <p className="text-xs text-[#8892A7] mt-0.5">
            Connect Stripe to start recovering real failed payments automatically.
          </p>
        </div>
        <a
          href="/connections"
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#ef4343] hover:bg-[#d63c3c] text-white font-semibold rounded-lg text-sm transition"
        >
          Connect Stripe →
        </a>
      </div>
    </div>
  );
}
