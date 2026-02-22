# RecoverHub

Payment recovery & dunning for indie SaaS — simpler than Churnkey, cheaper than Baremetrics Recover.

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, TailwindCSS, Radix UI
- **Backend:** Next.js API routes, PostgreSQL (Drizzle ORM)
- **Background Jobs:** BullMQ + Redis (Upstash)
- **Email:** Resend
- **Payments:** Stripe (OAuth, webhooks, Checkout)
- **Deployment:** Vercel (web) + Coolify (worker)

## Project Structure

```
recoverhub/
├── apps/
│   ├── web/         # Next.js dashboard
│   └── worker/      # BullMQ worker (retries + emails)
├── packages/
│   ├── db/          # Drizzle ORM + schema
│   └── config/      # Shared configs (TS, ESLint, Tailwind)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, etc.

# Push database schema
pnpm db:push

# Start development servers
pnpm dev
```

## Documentation

- [PRD](https://api.codevier.com/api/playground/projects/40c3d11e-d62b-4d6b-8018-e721b458063f/docs)
- [Architecture](https://api.codevier.com/api/playground/projects/40c3d11e-d62b-4d6b-8018-e721b458063f/docs)

## License

MIT
