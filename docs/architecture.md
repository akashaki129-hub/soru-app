# Soru Architecture Notes

## Current architecture

Soru uses TanStack Start and TanStack Router for web routes, Supabase for authentication, database,
RLS, storage, and Edge Functions, and Vercel for hosting and analytics.

Major areas:

- Public landing and lead capture
- Customer dashboard
- Chef Studio
- Admin dashboard
- Supabase Edge Functions for notifications and AI recommendations
- Supabase migrations for RLS, public discovery, market research, analytics, and marketplace data

## v2 direction

The v2 branch moves the app toward a controlled paid pilot rather than a broad delivery clone.

The intended transaction loop is:

1. Discover verified chef
2. Select meal
3. Choose quantity, delivery date, delivery window, and address
4. Review immutable price snapshot
5. Submit manual UPI/payment reference
6. Chef accepts or rejects
7. Chef updates preparation status
8. Customer sees timeline updates
9. Delivered
10. Review and reorder

## Security principles

- Public leads go through an Edge Function with server-side validation.
- Sensitive chef verification documents should use private Supabase Storage buckets.
- Public chef discovery requires `is_listed = true` and `verification_status = verified`.
- Authenticated pages must not be cached by the service worker.
- AI keys and service role keys must never be exposed to the client.
