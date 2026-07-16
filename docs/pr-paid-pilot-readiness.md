# PR: Paid Pilot Readiness

## Summary

This branch keeps the original Soru app intact and introduces a paid-pilot readiness foundation.

Implemented:

- legal/trust pages
- public-form consent
- canonical leads schema
- secure lead Edge Function
- lead rate limiting
- chef verification field foundation
- pilot order/payment table foundation
- safer PWA caching
- AI food guidance disclaimer
- environment example and operations docs

## Migration notes

Apply:

```bash
supabase db push --linked
supabase functions deploy soru-submit-lead
```

## Testing evidence

Baseline validation could not complete in this sandbox because npm registry DNS was unavailable
while installing dependencies for the standalone repo.

Required before merge:

```bash
pnpm install
pnpm check
```

## Security/RLS explanation

- `leads` has admin-only SELECT and service-role writes through the Edge Function.
- `orders`, `order_items`, `payment_records`, and `order_status_events` are scoped to customers,
  assigned chefs, and admins.
- The service worker explicitly avoids caching authenticated routes and API/Supabase responses.
- Sensitive chef verification documents are represented as private storage paths only.

## Known limitations

- Full checkout UI is not complete.
- Strict RPC-only order state transitions are scaffolded but not fully enforced.
- Admin feature modules and server-side pagination remain future work.
- Vitest/Playwright are documented but not installed because network access was unavailable.
