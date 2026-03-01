import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X, RefreshCw, Zap, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing — RecoverHub',
  description:
    'Simple, transparent pricing for payment recovery. Start free, pay when you recover revenue.',
  openGraph: {
    title: 'Pricing — RecoverHub',
    description:
      'Simple, transparent pricing for payment recovery. Start free, pay when you recover revenue.',
    url: 'https://recoverhub.threestack.io/pricing',
    siteName: 'RecoverHub',
    type: 'website',
  },
  alternates: {
    canonical: 'https://recoverhub.threestack.io/pricing',
  },
}

// ─── Plans ────────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For small SaaS products just getting started.',
    cta: 'Start Free',
    href: '/auth/signup',
    highlight: false,
    features: {
      'Up to $2k recovered MRR / month': true,
      'Stripe connected accounts': '1',
      'Smart retry logic': true,
      'Dunning email sequences': '1 template',
      'Failed payment dashboard': true,
      'Analytics (30-day)': true,
      'Webhook notifications': false,
      'Custom dunning templates': false,
      'Analytics (1-year)': false,
      'Priority support': false,
      'White-label emails': false,
      'API access': false,
    },
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For indie hackers and growing SaaS companies.',
    cta: 'Start Pro Trial',
    href: '/auth/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
    features: {
      'Up to $2k recovered MRR / month': false,
      'Stripe connected accounts': '5',
      'Smart retry logic': true,
      'Dunning email sequences': '3 templates',
      'Failed payment dashboard': true,
      'Analytics (30-day)': false,
      'Webhook notifications': true,
      'Custom dunning templates': true,
      'Analytics (1-year)': true,
      'Priority support': false,
      'White-label emails': false,
      'API access': false,
    },
    featuresOverride: {
      'Up to $2k recovered MRR / month': 'Unlimited recovered MRR',
      'Analytics (30-day)': null,
    },
  },
  {
    name: 'Business',
    price: '$49',
    period: 'per month',
    description: 'For teams with advanced recovery workflows.',
    cta: 'Start Business Trial',
    href: '/auth/signup?plan=business',
    highlight: false,
    features: {
      'Up to $2k recovered MRR / month': false,
      'Stripe connected accounts': 'Unlimited',
      'Smart retry logic': true,
      'Dunning email sequences': 'Unlimited',
      'Failed payment dashboard': true,
      'Analytics (30-day)': false,
      'Webhook notifications': true,
      'Custom dunning templates': true,
      'Analytics (1-year)': true,
      'Priority support': true,
      'White-label emails': true,
      'API access': true,
    },
    featuresOverride: {
      'Up to $2k recovered MRR / month': 'Unlimited recovered MRR',
      'Analytics (30-day)': null,
    },
  },
]

const allFeatureKeys = [
  'Up to $2k recovered MRR / month',
  'Smart retry logic',
  'Failed payment dashboard',
  'Dunning email sequences',
  'Webhook notifications',
  'Custom dunning templates',
  'Analytics (30-day)',
  'Analytics (1-year)',
  'White-label emails',
  'Priority support',
  'API access',
]

const faq = [
  {
    q: 'How is "recovered MRR" counted?',
    a: 'Recovered MRR is the total monthly value of subscriptions where a failed payment was successfully retried through RecoverHub within 30 days of the original failure.',
  },
  {
    q: 'What happens if I exceed the Free plan limit?',
    a: "We'll notify you when you're approaching the $2k recovery limit. You can upgrade at any time — retries already in progress will continue to completion.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. Cancel from your settings with one click. Your account remains active until the end of the billing period.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'Yes — 14-day free trial for Pro and Business. No credit card required to start.',
  },
  {
    q: 'What email provider do you use for dunning?',
    a: 'We send dunning emails via your own Stripe-verified sender domain. White-label support (your own domain) is available on the Business plan.',
  },
  {
    q: 'Does RecoverHub work with Stripe Connect?',
    a: 'Yes. We support both standard Stripe accounts and Stripe Connect (platform accounts). Business plan supports unlimited connected accounts.',
  },
]

const competitors = [
  { name: 'RecoverHub (Pro)', price: '$19/mo', highlight: true },
  { name: 'Churnkey', price: '$100+/mo' },
  { name: 'Baremetrics Recover', price: '$89/mo' },
  { name: 'Stunning (Maxio)', price: '$50+/mo' },
  { name: 'ProfitWell Retain', price: '$149+/mo' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0c1022] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ef4343]">
              <RefreshCw className="h-4 w-4 text-white" />
            </span>
            RecoverHub
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-[#8892A7] hover:text-white transition">
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm px-4 py-2 rounded-lg bg-[#ef4343] hover:bg-[#d63c3c] transition font-medium"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#ef4343]/30 bg-[#ef4343]/10 text-xs font-medium text-[#ef4343] mb-6">
            <Shield className="w-3 h-3" />
            7-day money-back guarantee
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Recover revenue. Keep your{' '}
            <span className="text-[#ef4343]">MRR growing.</span>
          </h1>
          <p className="text-xl text-[#8892A7] max-w-2xl mx-auto">
            Start free. Upgrade only when you need it. No per-seat pricing, no surprise charges.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlight
                  ? 'border-[#ef4343]/40 bg-[#ef4343]/5'
                  : 'border-white/[0.08] bg-[#131829]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#ef4343] text-white">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[#8892A7] pb-1 text-sm">/{plan.period}</span>
                </div>
                <p className="text-sm text-[#8892A7]">{plan.description}</p>
              </div>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition mb-8 ${
                  plan.highlight
                    ? 'bg-[#ef4343] hover:bg-[#d63c3c] text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {allFeatureKeys.map((key) => {
                  const override =
                    plan.featuresOverride?.[key as keyof typeof plan.featuresOverride]
                  if (override === null) return null
                  const label = override || key
                  const val = plan.features[key as keyof typeof plan.features]
                  const included = val === true || (typeof val === 'string')
                  const displayVal = typeof val === 'string' ? val : null

                  return (
                    <li key={key} className="flex items-start gap-3 text-sm">
                      {included ? (
                        <Check className="w-4 h-4 text-[#ef4343] shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                      )}
                      <span className={included ? 'text-gray-200' : 'text-white/30'}>
                        {displayVal ? (
                          <>
                            <span className="font-medium text-white">{displayVal}</span>{' '}
                            {key.replace(/^(Up to \$2k recovered MRR \/ month|[0-9]+ )/i, '')}
                          </>
                        ) : (
                          label
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Competitor comparison */}
        <div className="mb-20 p-8 rounded-2xl border border-white/[0.08] bg-[#131829]">
          <h2 className="text-xl font-bold text-center mb-2">10× cheaper than alternatives</h2>
          <p className="text-center text-sm text-[#8892A7] mb-8">
            Same recovery power. A fraction of the cost.
          </p>
          <div className="space-y-3 max-w-lg mx-auto">
            {competitors.map((c) => (
              <div
                key={c.name}
                className={`flex items-center justify-between px-5 py-3.5 rounded-xl ${
                  c.highlight
                    ? 'bg-[#ef4343]/10 border border-[#ef4343]/30'
                    : 'bg-white/5 border border-white/[0.06]'
                }`}
              >
                <span className={`font-medium text-sm ${c.highlight ? 'text-white' : 'text-[#8892A7]'}`}>
                  {c.name}
                </span>
                <span
                  className={`font-bold text-sm ${
                    c.highlight ? 'text-[#ef4343]' : 'text-white/40'
                  }`}
                >
                  {c.price}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#8892A7]/50 mt-4">
            * Competitor pricing as of March 2026. Actual prices may vary.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-white/[0.08] bg-[#131829] p-6"
              >
                <h3 className="font-semibold mb-2 text-sm">{item.q}</h3>
                <p className="text-[#8892A7] text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-12 rounded-2xl border border-white/[0.08] bg-[#131829]">
          <h2 className="text-2xl font-bold mb-3">Start recovering revenue today</h2>
          <p className="text-[#8892A7] text-sm mb-6">
            Free forever. No credit card required. Setup takes 2 minutes.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#ef4343] hover:bg-[#d63c3c] text-white font-semibold transition"
          >
            Connect Stripe & Start Free
            <RefreshCw className="w-4 h-4" />
          </Link>
          <p className="text-xs text-[#8892A7]/50 mt-4">
            7-day money-back guarantee on all paid plans.
          </p>
        </div>
      </div>
    </div>
  )
}
