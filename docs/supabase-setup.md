# Supabase Setup

## Migrations

Apply migrations in order:

```bash
supabase db push --linked
```

The paid-pilot branch adds:

- `20260716150000_paid_pilot_foundation.sql`

This migration introduces canonical leads, consent/source attribution, chef verification fields,
pilot checkout tables, payment records, and order status events.

## Edge Functions

Deploy:

```bash
supabase functions deploy soru-submit-lead
supabase functions deploy soru-ai-recommendations
supabase functions deploy soru-notifications
```

Required secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY` optional, enables Cloudflare Turnstile verification
- AI provider secrets for `soru-ai-recommendations`
- Notification provider secrets for `soru-notifications`

## Storage

Create private buckets before enabling document upload flows:

- `chef-identity-documents`
- `chef-fssai-documents`
- `chef-kitchen-photos`
- `chef-profile-photos`
- `menu-item-photos`

Documents should only be served to authorised admins through signed URLs.
