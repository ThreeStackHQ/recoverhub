'use client'

import React, { useState, useMemo } from 'react'
import { AlertCircle, Search, RefreshCw, Mail, ChevronDown, ChevronLeft, ChevronRight, Clock, XCircle, CheckCircle2, Loader2 } from 'lucide-react'

// Sprint 1.11 — Failed Payments Dashboard — Wren

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentStatus = 'new' | 'retrying' | 'recovered' | 'failed' | 'manual'

interface FailedPayment {
  id: string
  customer: string
  email: string
  amount: string
  amountCents: number
  plan: string
  failedAt: string
  failureReason: string
  retries: number
  maxRetries: number
  nextRetry?: string
  status: PaymentStatus
  stripeId: string
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_PAYMENTS: FailedPayment[] = [
  { id: '1', customer: 'Acme Corp', email: 'billing@acme.com', amount: '$299.00', amountCents: 29900, plan: 'Pro Annual', failedAt: '2 min ago', failureReason: 'Card declined', retries: 0, maxRetries: 4, nextRetry: 'In 1 hour', status: 'new', stripeId: 'pi_3NxAbc' },
  { id: '2', customer: 'Startup Labs', email: 'founders@startuplabs.io', amount: '$49.00', amountCents: 4900, plan: 'Starter Monthly', failedAt: '1 hour ago', failureReason: 'Insufficient funds', retries: 1, maxRetries: 4, nextRetry: 'In 23 hours', status: 'retrying', stripeId: 'pi_3NxDef' },
  { id: '3', customer: 'DesignCo', email: 'finance@designco.com', amount: '$149.00', amountCents: 14900, plan: 'Pro Monthly', failedAt: '3 hours ago', failureReason: 'Card expired', retries: 2, maxRetries: 4, nextRetry: 'In 3 days', status: 'retrying', stripeId: 'pi_3NxGhi' },
  { id: '4', customer: 'TechVentures', email: 'admin@techventures.co', amount: '$599.00', amountCents: 59900, plan: 'Business Annual', failedAt: '6 hours ago', failureReason: 'Do not honor', retries: 3, maxRetries: 4, nextRetry: 'In 7 days', status: 'retrying', stripeId: 'pi_3NxJkl' },
  { id: '5', customer: 'CloudPlatform', email: 'billing@cloudplatform.io', amount: '$29.00', amountCents: 2900, plan: 'Basic Monthly', failedAt: '1 day ago', failureReason: 'Card declined', retries: 4, maxRetries: 4, status: 'failed', stripeId: 'pi_3NxMno' },
  { id: '6', customer: 'GrowthHQ', email: 'payments@growthhq.com', amount: '$199.00', amountCents: 19900, plan: 'Pro Monthly', failedAt: '2 days ago', failureReason: 'Insufficient funds', retries: 2, maxRetries: 4, status: 'recovered', stripeId: 'pi_3NxPqr' },
  { id: '7', customer: 'RetailBase', email: 'finance@retailbase.com', amount: '$399.00', amountCents: 39900, plan: 'Enterprise', failedAt: '3 days ago', failureReason: 'Card declined', retries: 0, maxRetries: 4, status: 'manual', stripeId: 'pi_3NxStu' },
  { id: '8', customer: 'ScaleOps', email: 'billing@scaleops.io', amount: '$99.00', amountCents: 9900, plan: 'Pro Monthly', failedAt: '4 days ago', failureReason: 'Expired card', retries: 1, maxRetries: 4, nextRetry: 'In 2 days', status: 'retrying', stripeId: 'pi_3NxVwx' },
]

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: React.ElementType; classes: string }> = {
  new:       { label: 'New',       icon: AlertCircle,   classes: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  retrying:  { label: 'Retrying',  icon: RefreshCw,     classes: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  recovered: { label: 'Recovered', icon: CheckCircle2,  classes: 'bg-green-500/15 text-green-400 border-green-500/20' },
  failed:    { label: 'Failed',    icon: XCircle,       classes: 'bg-red-500/15 text-red-400 border-red-500/20' },
  manual:    { label: 'Manual',    icon: Clock,         classes: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
}

const PAGE_SIZE = 8

// ─── Component ─────────────────────────────────────────────────────────────────

export default function FailedPaymentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return MOCK_PAYMENTS.filter((p) => {
      const matchSearch = !search ||
        p.customer.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.stripeId.includes(search)
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalAtRisk = MOCK_PAYMENTS.filter(p => ['new','retrying'].includes(p.status)).reduce((s, p) => s + p.amountCents, 0) / 100
  const totalRecovered = MOCK_PAYMENTS.filter(p => p.status === 'recovered').reduce((s, p) => s + p.amountCents, 0) / 100

  async function handleRetry(id: string) {
    setActionLoading(id + '-retry')
    await new Promise(r => setTimeout(r, 1200))
    setActionLoading(null)
  }

  async function handleEmail(id: string) {
    setActionLoading(id + '-email')
    await new Promise(r => setTimeout(r, 800))
    setActionLoading(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Failed Payments</h1>
          <p className="text-sm text-[#7c8ba1] mt-0.5">Monitor and recover failed payment attempts</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a2535] border border-white/[0.08] text-sm text-[#c0cfe0] hover:bg-[#243045] transition-colors">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'At Risk', value: `$${totalAtRisk.toFixed(0)}`, sub: `${MOCK_PAYMENTS.filter(p => ['new','retrying'].includes(p.status)).length} payments`, color: 'text-amber-400' },
          { label: 'Recovered', value: `$${totalRecovered.toFixed(0)}`, sub: `${MOCK_PAYMENTS.filter(p => p.status === 'recovered').length} payments`, color: 'text-green-400' },
          { label: 'Total Failed', value: MOCK_PAYMENTS.length.toString(), sub: 'all time', color: 'text-white' },
          { label: 'Recovery Rate', value: `${Math.round(MOCK_PAYMENTS.filter(p => p.status === 'recovered').length / MOCK_PAYMENTS.length * 100)}%`, sub: 'this month', color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-[#0d1221] border border-white/[0.07] p-4">
            <p className="text-xs text-[#7c8ba1] mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[#7c8ba1] mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c8ba1]" />
          <input
            type="text"
            placeholder="Search by customer, email, or Stripe ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0d1221] border border-white/[0.08] text-sm text-white placeholder-[#4a5568] focus:outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-white/[0.08] bg-[#0d1221] px-3 text-sm text-[#c0cfe0] focus:outline-none focus:border-blue-500/40"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="retrying">Retrying</option>
          <option value="recovered">Recovered</option>
          <option value="failed">Failed</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#0d1221] border border-white/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#7c8ba1]">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#7c8ba1]">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#7c8ba1]">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#7c8ba1]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#7c8ba1]">Retries</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#7c8ba1]">Failed</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#7c8ba1]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((payment) => {
                const cfg = STATUS_CONFIG[payment.status]
                const StatusIcon = cfg.icon
                const isExp = expanded === payment.id
                return (
                  <React.Fragment key={payment.id}>
                    <tr
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : payment.id)}
                    >
                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white text-xs">{payment.customer}</p>
                          <p className="text-xs text-[#7c8ba1]">{payment.email}</p>
                        </div>
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-white">{payment.amount}</p>
                          <p className="text-xs text-[#7c8ba1]">{payment.plan}</p>
                        </div>
                      </td>
                      {/* Reason */}
                      <td className="px-4 py-3 text-xs text-[#7c8ba1]">{payment.failureReason}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      {/* Retries */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: payment.maxRetries }).map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i < payment.retries ? (payment.status === 'recovered' ? 'bg-green-400' : 'bg-amber-400') : 'bg-white/10'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-[#7c8ba1]">{payment.retries}/{payment.maxRetries}</span>
                        </div>
                      </td>
                      {/* Failed at */}
                      <td className="px-4 py-3 text-xs text-[#7c8ba1] whitespace-nowrap">{payment.failedAt}</td>
                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {payment.status !== 'recovered' && payment.status !== 'failed' && (
                            <button
                              onClick={() => handleRetry(payment.id)}
                              disabled={actionLoading === payment.id + '-retry'}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === payment.id + '-retry' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              Retry
                            </button>
                          )}
                          <button
                            onClick={() => handleEmail(payment.id)}
                            disabled={actionLoading === payment.id + '-email'}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#c0cfe0] text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === payment.id + '-email' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                            Email
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-[#7c8ba1] hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded row */}
                    {isExp && (
                      <tr className="border-b border-white/[0.04] bg-white/[0.015]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-[#7c8ba1] mb-1">Stripe Payment ID</p>
                              <code className="text-blue-400 font-mono">{payment.stripeId}</code>
                            </div>
                            <div>
                              <p className="text-[#7c8ba1] mb-1">Next Retry</p>
                              <p className="text-white">{payment.nextRetry ?? 'No more retries'}</p>
                            </div>
                            <div>
                              <p className="text-[#7c8ba1] mb-1">Plan</p>
                              <p className="text-white">{payment.plan}</p>
                            </div>
                            <div>
                              <p className="text-[#7c8ba1] mb-1">Recovery Options</p>
                              <div className="flex gap-2 flex-wrap mt-1">
                                <button className="px-2 py-1 rounded bg-white/[0.06] text-[#c0cfe0] hover:bg-white/10 transition-colors">Update Card</button>
                                <button className="px-2 py-1 rounded bg-white/[0.06] text-[#c0cfe0] hover:bg-white/10 transition-colors">Forgive</button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#7c8ba1]">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No failed payments match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07]">
            <p className="text-xs text-[#7c8ba1]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#7c8ba1]" />
              </button>
              <span className="text-xs text-[#7c8ba1] px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4 text-[#7c8ba1]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
