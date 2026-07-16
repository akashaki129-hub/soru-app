# Soru App

Soru is a chef-powered food marketplace connecting customers with verified home chefs,
homemakers, culinary students, caterers, and food creators for affordable daily meals,
subscriptions, chef specials, student lunchboxes, and personalised food needs.

Tagline: **Every chef’s special, closer to home.**

## Stack

- TanStack Start
- TanStack Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Database, RLS, Storage, and Edge Functions
- Radix/shadcn UI
- Vercel deployment and analytics

## Branch strategy

The original app remains on `main`. Paid-pilot readiness work lives on:

```bash
feat/paid-pilot-readiness
```

Do not merge this branch until migrations, Edge Functions, and smoke tests are reviewed.

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Fill `.env` with project-specific values. Never commit `.env`.

## Checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Note: the current v2 branch includes placeholder test scripts because npm registry access was
unavailable while this branch was prepared. Install Vitest, React Testing Library, and Playwright
before treating CI as complete.

## Paid-pilot foundation in this branch

- Legal/trust pages: `/privacy`, `/terms`, `/refund-policy`, `/food-safety`, `/ai-food-guidance`
- Feature flags for pilot, demo content, payments, AI, delivery, and reviews
- Public forms require privacy/contact consent
- Public forms submit through `soru-submit-lead` Edge Function instead of direct public table inserts
- Canonical `leads` table with normalized phone/email and safe deduplication
- Lead rate-limiting table for per-IP and per-contact throttling
- Chef verification-oriented fields for private document workflows
- Pilot order/payment schema foundation with immutable order-item snapshots and status events
- Safer service worker that does not cache authenticated pages or private API responses

## Known limitations

- Full checkout UI, chef order acceptance UI, admin payment verification UI, and strict RPC-only
  order transitions are not complete in this first v2 pass.
- Vitest and Playwright dependencies are not installed yet because package registry access was
  unavailable in the working environment.
- Supabase migrations and Edge Functions must be deployed manually to the target Supabase project
  before the new lead function is active in production.
