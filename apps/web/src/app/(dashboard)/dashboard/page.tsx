import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-[#8892A7] mt-1">
          Welcome back, {session.user?.name ?? session.user?.email}
        </p>
      </div>

      {/* Sprint 2.5 will build the full recovery dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 border border-white/10 rounded-xl bg-[#131829]">
          <h3 className="text-sm font-medium text-[#8892A7]">Total Recovered MRR</h3>
          <p className="text-2xl font-bold mt-2 text-white">$0</p>
        </div>
        <div className="p-6 border border-white/10 rounded-xl bg-[#131829]">
          <h3 className="text-sm font-medium text-[#8892A7]">Success Rate</h3>
          <p className="text-2xl font-bold mt-2 text-white">0%</p>
        </div>
        <div className="p-6 border border-white/10 rounded-xl bg-[#131829]">
          <h3 className="text-sm font-medium text-[#8892A7]">Active Retries</h3>
          <p className="text-2xl font-bold mt-2 text-white">0</p>
        </div>
      </div>

      <div className="p-8 border border-white/10 rounded-xl bg-[#131829] text-center">
        <p className="text-[#8892A7] text-sm">
          Connect your Stripe account to start recovering failed payments.
        </p>
        <a
          href="/connections"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#ef4343] hover:bg-[#d63c3c] text-white font-semibold rounded-lg text-sm transition"
        >
          Connect Stripe →
        </a>
      </div>
    </div>
  );
}
