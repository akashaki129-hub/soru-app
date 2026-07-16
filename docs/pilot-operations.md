# Pilot Operations Guide

## Lead handling

New public lead submissions land in `public.leads`. Legacy tables remain for historical reporting.

Recommended workflow:

1. Review new leads in admin.
2. Mark qualified users.
3. Convert invited users into Supabase Auth accounts.
4. Link `converted_user_id` once conversion is complete.

## Chef verification

Chef self-reported FSSAI status is not Soru verification.

Operational review should confirm:

- identity information
- kitchen/photo evidence
- menu/category suitability
- FSSAI status or application readiness
- allergy and hygiene handling
- service area and capacity

Only admins should set `verification_status = verified`.

## Payment pilot

The paid-pilot foundation supports manual UPI confirmation. Do not show “Payment successful” until
payment evidence is verified by admin operations.

Payment states:

- pending
- submitted
- verified
- rejected
- refunded

## Order operations

The schema includes immutable order item snapshots and status-event logging. The next implementation
phase should move all status changes into secure PostgreSQL RPCs with role-restricted transitions.
