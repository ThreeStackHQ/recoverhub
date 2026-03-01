'use client'

import React, { useState } from 'react'
import { Link2, CheckCircle2, AlertCircle, ExternalLink, Trash2, RefreshCw, ShieldCheck, Key, Globe, Building2 } from 'lucide-react'

// Sprint 1.7 — Stripe Connection UI — Wren

// ─── Types ─────────────────────────────────────────────────────────────────────

type ConnectionMode = 'live' | 'test'

interface StripeAccount {
  id: string
  displayName: string
  email: string
  country: string
  currency: string
  mode: ConnectionMode
  connectedAt: string
  lastSync: string
  webhookConfigured: boolean
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_CONNECTION: StripeAccount = {
  id: 'acct_1MxAmZ2eZvKYlo2C',
  displayName: 'Acme Corp',
  email: 'billing@acme.com',
  country: 'United States',
  currency: 'USD',
  mode: 'live',
  connectedAt: 'Feb 15, 2026',
  lastSync: '2 minutes ago',
  webhookConfigured: true,
}

const FEATURE_LIST = [
  { icon: RefreshCw, title: 'Automatic Retry Engine', desc: 'RecoverHub watches your failed charges and retries them on the optimal schedule.' },
  { icon: Globe, title: 'Real-Time Webhooks', desc: 'Instant notifications when payments fail, succeed, or need attention.' },
  { icon: ShieldCheck, title: 'Read-Only Access', desc: 'RecoverHub only charges your customers on retry attempts you approve.' },
  { icon: Key, title: 'Secure by Default', desc: 'OAuth flow — we never see your Stripe secret keys.' },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [connected, setConnected] = useState(true)
  const [connection, setConnection] = useState<StripeAccount>(MOCK_CONNECTION)
  const [showDisconnect, setShowDisconnect] = useState(false)
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1500))
    setConnection(c => ({ ...c, lastSync: 'just now' }))
    setSyncing(false)
  }

  function handleDisconnect() {
    setConnected(false)
    setShowDisconnect(false)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Stripe Connection</h1>
        <p className="text-sm text-[#7c8ba1] mt-0.5">Connect your Stripe account to start recovering failed payments automatically</p>
      </div>

      {connected ? (
        <>
          {/* Connected account card */}
          <div className="rounded-2xl bg-[#0d1221] border border-white/[0.08] overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-green-500/5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-sm font-medium text-green-400">Connected</p>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${connection.mode === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {connection.mode === 'live' ? '🟢 Live' : '🟡 Test'}
                </span>
              </div>
            </div>

            {/* Account info */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#635bff]/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#635bff]">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">{connection.displayName}</p>
                  <p className="text-xs text-[#7c8ba1]">{connection.email}</p>
                  <p className="text-xs text-[#7c8ba1] mt-0.5 font-mono">{connection.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Country', value: connection.country },
                  { label: 'Currency', value: connection.currency },
                  { label: 'Connected', value: connection.connectedAt },
                  { label: 'Last sync', value: connection.lastSync },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[#7c8ba1]">{item.label}</p>
                    <p className="text-white font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook status */}
            <div className={`flex items-center gap-3 mx-5 mb-5 px-4 py-3 rounded-xl border ${connection.webhookConfigured ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              {connection.webhookConfigured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Webhook configured</p>
                    <p className="text-xs text-[#7c8ba1]">RecoverHub is receiving Stripe events in real-time</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Webhook not configured</p>
                    <p className="text-xs text-[#7c8ba1]">Real-time event detection is disabled</p>
                  </div>
                  <button className="ml-auto text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">Fix →</button>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-[#c0cfe0] hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <a
                href={`https://dashboard.stripe.com/${connection.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-[#c0cfe0] hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Stripe Dashboard
              </a>
              <button
                onClick={() => setShowDisconnect(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-colors ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>

          {/* Disconnect confirm */}
          {showDisconnect && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDisconnect(false)} />
              <div className="relative w-full max-w-sm rounded-2xl bg-[#0d1221] border border-red-500/20 shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Disconnect Stripe</h2>
                    <p className="text-xs text-[#7c8ba1]">This will stop all recovery automation</p>
                  </div>
                </div>
                <p className="text-sm text-[#7c8ba1] mb-6">
                  Disconnecting will pause all dunning emails and retry attempts. Your existing data will be preserved.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDisconnect(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#7c8ba1] bg-white/[0.06] hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleDisconnect} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-400 transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Not connected */
        <div className="rounded-2xl bg-[#0d1221] border border-white/[0.08] p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#635bff]/15 flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-[#635bff]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connect Your Stripe Account</h2>
            <p className="text-sm text-[#7c8ba1] max-w-sm mx-auto">
              Authorize RecoverHub to monitor your failed payments and automatically retry them on the optimal schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {FEATURE_LIST.map((f) => (
              <div key={f.title} className="flex gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <f.icon className="w-5 h-5 text-[#635bff] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">{f.title}</p>
                  <p className="text-xs text-[#7c8ba1] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setConnected(true)}
              className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-white transition-colors shadow-lg"
              style={{ backgroundColor: '#635bff' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
              Connect with Stripe
            </button>
            <p className="text-xs text-[#7c8ba1] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              OAuth 2.0 — we never see your Stripe secret keys
            </p>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
        <div className="flex gap-3">
          <Building2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-400">Multiple Stripe accounts?</p>
            <p className="text-xs text-[#7c8ba1] mt-0.5">You can connect multiple Stripe accounts on the Pro plan. Upgrade to manage all your products from one dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
