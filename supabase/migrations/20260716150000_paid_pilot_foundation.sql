-- Paid pilot readiness foundation.
-- Adds canonical leads, consent/source attribution, verification fields, pilot checkout tables,
-- and status-transition RPC scaffolding without deleting legacy data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.normalize_email(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NULLIF(lower(btrim(coalesce(value, ''))), '')
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(coalesce(value, ''), '\D', '', 'g'), '')
$$;

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  normalized_phone TEXT GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED,
  email TEXT NOT NULL,
  normalized_email TEXT GENERATED ALWAYS AS (public.normalize_email(email)) STORED,
  role TEXT NOT NULL,
  city TEXT,
  locality TEXT,
  source TEXT NOT NULL,
  campaign TEXT,
  lead_status TEXT NOT NULL DEFAULT 'new',
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_version TEXT NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leads_role_check CHECK (role IN ('customer', 'chef', 'both', 'research')),
  CONSTRAINT leads_status_check CHECK (
    lead_status IN ('new', 'duplicate', 'contacted', 'qualified', 'converted', 'archived')
  ),
  CONSTRAINT leads_name_check CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT leads_email_check CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT leads_phone_check CHECK (public.is_realistic_phone(phone)),
  CONSTRAINT leads_source_check CHECK (char_length(btrim(source)) BETWEEN 2 AND 80),
  CONSTRAINT leads_consent_check CHECK (char_length(btrim(consent_version)) BETWEEN 2 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_normalized_phone_idx
ON public.leads (normalized_phone)
WHERE normalized_phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_normalized_email_idx
ON public.leads (normalized_email)
WHERE normalized_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_role_status_idx ON public.leads (role, lead_status);

DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

DROP POLICY IF EXISTS "Admins read leads" ON public.leads;
CREATE POLICY "Admins read leads" ON public.leads
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.lead_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rate_key, window_start)
);

ALTER TABLE public.lead_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.lead_rate_limits TO service_role;

DROP TRIGGER IF EXISTS set_lead_rate_limits_updated_at ON public.lead_rate_limits;
CREATE TRIGGER set_lead_rate_limits_updated_at
BEFORE UPDATE ON public.lead_rate_limits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.waitlist_entries
ADD COLUMN IF NOT EXISTS consent_version TEXT,
ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

ALTER TABLE public.customer_enrollments
ADD COLUMN IF NOT EXISTS consent_version TEXT,
ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

ALTER TABLE public.chef_enrollments
ADD COLUMN IF NOT EXISTS consent_version TEXT,
ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

ALTER TABLE public.market_research_responses
ADD COLUMN IF NOT EXISTS consent_version TEXT,
ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Safely backfill existing public signups into the new canonical leads table.
-- Rows with placeholder phones or malformed emails are intentionally skipped.
INSERT INTO public.leads (
  full_name,
  phone,
  email,
  role,
  city,
  source,
  campaign,
  consent_version,
  consent_at,
  metadata,
  created_at
)
SELECT
  btrim(name),
  phone,
  lower(btrim(email)),
  CASE
    WHEN lower(coalesce(role, '')) LIKE '%chef%'
      OR lower(coalesce(role, '')) LIKE '%cook%'
      OR lower(coalesce(role, '')) LIKE '%home%'
      OR lower(coalesce(role, '')) LIKE '%culinary%'
      THEN 'chef'
    WHEN lower(coalesce(role, '')) LIKE '%both%' THEN 'both'
    ELSE 'customer'
  END,
  city,
  coalesce(source, 'legacy_waitlist'),
  utm_campaign,
  coalesce(consent_version, 'legacy-import'),
  coalesce(consent_at, created_at, now()),
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_table', 'waitlist_entries',
    'legacy_id', id,
    'legacy_role', role,
    'comments', comments,
    'utm_source', utm_source,
    'utm_medium', utm_medium,
    'utm_campaign', utm_campaign
  )),
  created_at
FROM public.waitlist_entries
WHERE char_length(btrim(name)) BETWEEN 2 AND 120
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND public.is_realistic_phone(phone)
  AND NOT EXISTS (
    SELECT 1 FROM public.leads existing
    WHERE existing.normalized_phone = public.normalize_phone(waitlist_entries.phone)
      OR existing.normalized_email = public.normalize_email(waitlist_entries.email)
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (
  full_name,
  phone,
  email,
  role,
  source,
  campaign,
  consent_version,
  consent_at,
  metadata,
  created_at
)
SELECT
  btrim(name),
  phone,
  lower(btrim(email)),
  'customer',
  coalesce(source, 'legacy_customer_enrollment'),
  utm_campaign,
  coalesce(consent_version, 'legacy-import'),
  coalesce(consent_at, created_at, now()),
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_table', 'customer_enrollments',
    'legacy_id', id,
    'preferred_service', preferred_service,
    'comments', comments,
    'utm_source', utm_source,
    'utm_medium', utm_medium,
    'utm_campaign', utm_campaign
  )),
  created_at
FROM public.customer_enrollments
WHERE char_length(btrim(name)) BETWEEN 2 AND 120
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND public.is_realistic_phone(phone)
  AND NOT EXISTS (
    SELECT 1 FROM public.leads existing
    WHERE existing.normalized_phone = public.normalize_phone(customer_enrollments.phone)
      OR existing.normalized_email = public.normalize_email(customer_enrollments.email)
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (
  full_name,
  phone,
  email,
  role,
  source,
  campaign,
  consent_version,
  consent_at,
  metadata,
  created_at
)
SELECT
  btrim(name),
  phone,
  lower(btrim(email)),
  'chef',
  coalesce(source, 'legacy_chef_enrollment'),
  utm_campaign,
  coalesce(consent_version, 'legacy-import'),
  coalesce(consent_at, created_at, now()),
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_table', 'chef_enrollments',
    'legacy_id', id,
    'chef_role', role,
    'comments', comments,
    'utm_source', utm_source,
    'utm_medium', utm_medium,
    'utm_campaign', utm_campaign
  )),
  created_at
FROM public.chef_enrollments
WHERE char_length(btrim(name)) BETWEEN 2 AND 120
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND public.is_realistic_phone(phone)
  AND NOT EXISTS (
    SELECT 1 FROM public.leads existing
    WHERE existing.normalized_phone = public.normalize_phone(chef_enrollments.phone)
      OR existing.normalized_email = public.normalize_email(chef_enrollments.email)
  )
ON CONFLICT DO NOTHING;

ALTER TABLE public.chef_profiles
ADD COLUMN IF NOT EXISTS chef_reported_fssai_status TEXT,
ADD COLUMN IF NOT EXISTS fssai_number TEXT,
ADD COLUMN IF NOT EXISTS fssai_document_path TEXT,
ADD COLUMN IF NOT EXISTS identity_document_path TEXT,
ADD COLUMN IF NOT EXISTS kitchen_photo_paths TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  locality TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('SORU-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10))),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_profile_id UUID REFERENCES public.chef_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  delivery_date DATE NOT NULL,
  delivery_window TEXT NOT NULL,
  delivery_address_snapshot JSONB NOT NULL,
  delivery_instructions TEXT,
  allergy_confirmation BOOLEAN NOT NULL DEFAULT false,
  customer_phone TEXT NOT NULL,
  subtotal_inr INTEGER NOT NULL DEFAULT 0,
  platform_fee_inr INTEGER NOT NULL DEFAULT 0,
  delivery_fee_inr INTEGER NOT NULL DEFAULT 0,
  tax_inr INTEGER NOT NULL DEFAULT 0,
  final_total_inr INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'manual_upi',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending_confirmation',
      'awaiting_payment',
      'payment_submitted',
      'paid',
      'accepted_by_chef',
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
      'delivered',
      'rejected_by_chef',
      'cancelled_by_customer',
      'cancelled_by_admin',
      'refund_pending',
      'refunded'
    )
  ),
  CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('pending', 'submitted', 'verified', 'rejected', 'refunded')
  ),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('manual_upi', 'cash_after_confirmation')),
  CONSTRAINT orders_phone_check CHECK (public.is_realistic_phone(customer_phone))
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.chef_menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  chef_name TEXT NOT NULL,
  unit_price_inr INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  tax_inr INTEGER NOT NULL DEFAULT 0,
  platform_fee_inr INTEGER NOT NULL DEFAULT 0,
  delivery_fee_inr INTEGER NOT NULL DEFAULT 0,
  final_total_inr INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_check CHECK (quantity BETWEEN 1 AND 50)
);

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'manual_upi',
  status TEXT NOT NULL DEFAULT 'pending',
  amount_inr INTEGER NOT NULL,
  reference TEXT,
  evidence_path TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_records_status_check CHECK (
    status IN ('pending', 'submitted', 'verified', 'rejected', 'refunded')
  )
);

CREATE TABLE IF NOT EXISTS public.chef_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_profile_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  meal_type TEXT NOT NULL,
  order_cutoff_time TIME NOT NULL,
  maximum_orders INTEGER NOT NULL DEFAULT 10,
  preparation_minutes INTEGER NOT NULL DEFAULT 120,
  delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  pickup_enabled BOOLEAN NOT NULL DEFAULT true,
  blackout_dates DATE[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_availability_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT chef_availability_maximum_orders_check CHECK (maximum_orders BETWEEN 1 AND 500)
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_availability ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.customer_addresses TO authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT ON public.order_status_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_availability TO authenticated;

GRANT ALL ON public.customer_addresses TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.order_status_events TO service_role;
GRANT ALL ON public.payment_records TO service_role;
GRANT ALL ON public.chef_availability TO service_role;

DROP POLICY IF EXISTS "Users manage own addresses" ON public.customer_addresses;
CREATE POLICY "Users manage own addresses" ON public.customer_addresses
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers chefs and admins read orders" ON public.orders;
CREATE POLICY "Customers chefs and admins read orders" ON public.orders
FOR SELECT TO authenticated
USING (
  auth.uid() = customer_user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = orders.chef_profile_id
    AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
CREATE POLICY "Customers create own orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_user_id);

DROP POLICY IF EXISTS "Customers chefs and admins read order items" ON public.order_items;
CREATE POLICY "Customers chefs and admins read order items" ON public.order_items
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND (
      o.customer_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.chef_profiles cp
        WHERE cp.id = o.chef_profile_id
        AND cp.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Customers insert own order items during create" ON public.order_items;
CREATE POLICY "Customers insert own order items during create" ON public.order_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND o.customer_user_id = auth.uid()
    AND o.status = 'pending_confirmation'
  )
);

DROP POLICY IF EXISTS "Visible order status events" ON public.order_status_events;
CREATE POLICY "Visible order status events" ON public.order_status_events
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_events.order_id
    AND (
      o.customer_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.chef_profiles cp
        WHERE cp.id = o.chef_profile_id
        AND cp.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Visible payment records" ON public.payment_records;
CREATE POLICY "Visible payment records" ON public.payment_records
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_records.order_id
    AND o.customer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers submit payment records" ON public.payment_records;
CREATE POLICY "Customers submit payment records" ON public.payment_records
FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_records.order_id
    AND o.customer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Chefs manage own availability" ON public.chef_availability;
CREATE POLICY "Chefs manage own availability" ON public.chef_availability
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = chef_availability.chef_profile_id
    AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = chef_availability.chef_profile_id
    AND cp.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.record_order_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_events(order_id, old_status, new_status, actor_user_id, actor_role, note)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'system', 'Order created');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_events(order_id, old_status, new_status, actor_user_id, actor_role, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'system', 'Status changed');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_order_status_insert ON public.orders;
CREATE TRIGGER record_order_status_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.record_order_status_event();

DROP TRIGGER IF EXISTS record_order_status_update ON public.orders;
CREATE TRIGGER record_order_status_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.record_order_status_event();
