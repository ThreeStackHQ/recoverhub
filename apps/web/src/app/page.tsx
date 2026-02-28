import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Zap,
  RefreshCw,
  Mail,
  Shield,
  TrendingUp,
  CreditCard,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'RecoverHub — Recover Failed Payments. Keep Your SaaS Alive.',
  description:
    'Stop losing revenue to failed Stripe payments. RecoverHub automatically retries charges and sends smart dunning emails — simpler and cheaper than Churnkey or Baremetrics.',
  keywords: [
    'payment recovery',
    'failed payments',
    'Stripe',
    'dunning emails',
    'SaaS',
    'churn reduction',
  ],
  openGraph: {
    title: 'RecoverHub — Recover Failed Payments. Keep Your SaaS Alive.',
    description:
      'Stop losing revenue to failed Stripe payments. Simpler and cheaper than Churnkey.',
    url: 'https://recoverhub.threestack.io',
    siteName: 'RecoverHub',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RecoverHub — Recover Failed Payments',
    description: 'Stripe-native payment recovery. Simpler and cheaper than Churnkey.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://recoverhub.threestack.io',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RecoverHub',
  applicationCategory: 'BusinessApplication',
  description: 'Automatic payment recovery for Stripe-powered SaaS products',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '19',
      priceCurrency: 'USD',
      billingIncrement: 'month',
    },
    {
      '@type': 'Offer',
      name: 'Business',
      price: '49',
      priceCurrency: 'USD',
      billingIncrement: 'month',
    },
  ],
  url: 'https://recoverhub.threestack.io',
}

interface Feature {
  icon: React.ElementType
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: CreditCard,
    title: 'Stripe-Native',
    description:
      'Built directly on Stripe webhooks. Zero integration headaches — connect in under 5 minutes.',
  },
  {
    icon: RefreshCw,
    title: 'Smart Auto-Retry',
    description:
      'Intelligently retry failed charges at optimal times based on failure reason and card type.',
  },
  {
    icon: Mail,
    title: 'Dunning Email Sequences',
    description:
      "Automated email sequences that nudge customers to update their payment info — before you lose them.",
  },
  {
    icon: Zap,
    title: 'Instant Alerts',
    description:
      'Get notified the moment a payment fails. React fast before subscriptions lapse.',
  },
  {
    icon: TrendingUp,
    title: 'Recovery Analytics',
    description:
      "See exactly how much revenue you're recovering. Track trends and optimize over time.",
  },
  {
    icon: Shield,
    title: 'Compliance Ready',
    description:
      'PCI-compliant by design. Your customer card data never touches our servers.',
  },
]

interface PricingPlan {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
  badge?: string
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for early-stage products',
    features: [
      'Up to $1k MRR monitored',
      '1 Stripe account',
      'Basic auto-retry (3 attempts)',
      'Email alerts',
      'Community support',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For growing SaaS products',
    features: [
      'Up to $20k MRR monitored',
      '3 Stripe accounts',
      'Smart retry logic',
      'Dunning email sequences (5 emails)',
      'Recovery analytics dashboard',
      'Priority email support',
    ],
    cta: 'Start 14-Day Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Business',
    price: '$49',
    period: '/mo',
    description: 'For established SaaS businesses',
    features: [
      'Unlimited MRR monitored',
      'Unlimited Stripe accounts',
      'Advanced retry strategies',
      'Custom dunning sequences',
      'White-label emails',
      'Slack + webhook alerts',
      'Dedicated support',
    ],
    cta: 'Start 14-Day Trial',
    highlighted: false,
  },
]

interface Competitor {
  name: string
  price: string
  cons: string[]
}

const competitors: Competitor[] = [
  {
    name: 'Churnkey',
    price: '$150+/mo',
    cons: ['Complex setup required', 'Expensive for indie devs', 'Too many unused features'],
  },
  {
    name: 'Baremetrics',
    price: '$108+/mo',
    cons: ['Analytics-focused, not recovery', 'Limited dunning tools', 'High price floor'],
  },
]

interface Testimonial {
  quote: string
  author: string
  role: string
  initials: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'RecoverHub recovered $2,400 in its first month. Set it up in 10 minutes and forgot about it.',
    author: 'Alex M.',
    role: 'Indie SaaS founder',
    initials: 'AM',
  },
  {
    quote:
      "Finally — payment recovery that doesn't cost more than it recovers. Simple, effective, done.",
    author: 'Sarah K.',
    role: 'Solo developer',
    initials: 'SK',
  },
  {
    quote: 'Switched from Churnkey. Same results, 1/8th the price. Wish I found this sooner.',
    author: 'Marcus T.',
    role: 'SaaS founder',
    initials: 'MT',
  },
]

const footerLinks: { heading: string; items: string[] }[] = [
  { heading: 'Product', items: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
  { heading: 'Company', items: ['About', 'Blog', 'Contact'] },
  { heading: 'Legal', items: ['Privacy Policy', 'Terms of Service'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1E] text-white">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0B0F1E]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ef4343] flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">RecoverHub</span>
            </div>

            {/* Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-sm text-[#8892A7] hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-[#8892A7] hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#compare"
                className="text-sm text-[#8892A7] hover:text-white transition-colors"
              >
                Compare
              </Link>
              <Link
                href="/auth/login"
                className="text-sm text-[#8892A7] hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>

            {/* CTA */}
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ef4343] hover:bg-[#d63c3c] text-white text-sm font-medium transition-colors"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#ef4343]/10 blur-[120px] rounded-full pointer-events-none"
        />

        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#ef4343]/30 bg-[#ef4343]/10 text-[#ef4343] text-xs font-medium mb-6">
              <Zap className="w-3 h-3" />
              Stripe-Native Payment Recovery
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
              Stop Losing Revenue
              <br />
              to{' '}
              <span className="text-[#ef4343]">Failed Payments</span>
            </h1>

            <p className="text-lg text-[#8892A7] mb-10 max-w-2xl mx-auto leading-relaxed">
              RecoverHub automatically retries failed Stripe charges and sends smart dunning emails.
              Recover up to 80% of failed payments — simpler and cheaper than Churnkey or
              Baremetrics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#ef4343] hover:bg-[#d63c3c] text-white font-semibold transition-colors text-base"
              >
                Start for Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 hover:border-white/20 text-white font-medium transition-colors text-base"
              >
                View Pricing
              </Link>
            </div>

            <p className="text-[#8892A7] text-sm mt-4">
              No credit card required · Connect in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* ─── Comparison Section ─── */}
      <section id="compare" className="py-16 px-4 sm:px-6 lg:px-8 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Why indie devs choose RecoverHub</h2>
            <p className="text-[#8892A7]">Same results as the big tools. A fraction of the cost.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {competitors.map((comp) => (
              <div
                key={comp.name}
                className="rounded-xl border border-white/10 bg-[#131829] p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-[#8892A7]">{comp.name}</span>
                  <span className="text-sm font-bold text-[#ef4343]">{comp.price}</span>
                </div>
                <ul className="space-y-2">
                  {comp.cons.map((con) => (
                    <li key={con} className="flex items-center gap-2 text-sm text-[#8892A7]">
                      <span className="text-[#ef4343] font-bold">✗</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* RecoverHub card */}
            <div className="rounded-xl border border-[#ef4343]/50 bg-[#ef4343]/5 p-6 ring-1 ring-[#ef4343]/20">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-white">RecoverHub</span>
                <span className="text-sm font-bold text-[#ef4343]">from $0/mo</span>
              </div>
              <ul className="space-y-2">
                {[
                  'Stripe-native, 5-min setup',
                  'Simple, focused UI',
                  'Indie-dev pricing',
                ].map((pro) => (
                  <li key={pro} className="flex items-center gap-2 text-sm text-white">
                    <Check className="w-4 h-4 text-[#ef4343] flex-shrink-0" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything you need to recover revenue
            </h2>
            <p className="text-[#8892A7] max-w-xl mx-auto">
              Purpose-built for Stripe. No bloat, no complexity — just the tools that actually
              recover payments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-white/5 bg-[#131829] p-6 hover:border-[#ef4343]/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#ef4343]/10 flex items-center justify-center mb-4 group-hover:bg-[#ef4343]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#ef4343]" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-[#8892A7] text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-[#8892A7]">Start free. Upgrade when you need it. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-[#ef4343] bg-[#ef4343]/5 ring-1 ring-[#ef4343]/20'
                    : 'border-white/10 bg-[#131829]'
                }`}
              >
                {plan.badge && (
                  <div className="inline-flex mb-4">
                    <span className="px-2 py-0.5 rounded-full bg-[#ef4343] text-white text-xs font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-[#8892A7] text-sm">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-[#8892A7] text-sm">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#ef4343] flex-shrink-0 mt-0.5" />
                      <span className="text-[#8892A7]">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/login"
                  className={`w-full text-center py-3 rounded-lg font-medium text-sm transition-colors ${
                    plan.highlighted
                      ? 'bg-[#ef4343] hover:bg-[#d63c3c] text-white'
                      : 'border border-white/10 hover:border-white/20 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials Section ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trusted by indie devs</h2>
            <p className="text-[#8892A7]">Real results from real founders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="rounded-xl border border-white/5 bg-[#131829] p-6"
              >
                <p className="text-[#8892A7] text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#ef4343]/20 flex items-center justify-center text-[#ef4343] text-xs font-bold flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t.author}</div>
                    <div className="text-[#8892A7] text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[300px] bg-[#ef4343]/5 blur-[100px] pointer-events-none"
        />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl font-bold mb-4">Start recovering revenue today</h2>
          <p className="text-[#8892A7] mb-8">
            Connect your Stripe account in 5 minutes. No engineers needed.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#ef4343] hover:bg-[#d63c3c] text-white font-semibold transition-colors text-lg"
          >
            Start for Free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-[#8892A7] text-sm mt-4">No credit card required</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#ef4343] flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold">RecoverHub</span>
              </div>
              <p className="text-[#8892A7] text-sm leading-relaxed">
                Payment recovery for indie SaaS. Built by founders, for founders.
              </p>
            </div>

            {footerLinks.map((col) => (
              <div key={col.heading}>
                <h4 className="font-semibold text-sm mb-4">{col.heading}</h4>
                <ul className="space-y-2">
                  {col.items.map((item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-[#8892A7] text-sm hover:text-white transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#8892A7] text-sm">
              &copy; {new Date().getFullYear()} RecoverHub. All rights reserved.
            </p>
            <p className="text-[#8892A7] text-sm">
              A <span className="text-white font-medium">ThreeStack</span> product
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
