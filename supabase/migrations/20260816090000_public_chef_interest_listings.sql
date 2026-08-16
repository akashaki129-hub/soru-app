-- Public chef interest listings for pre-investor chef acquisition.
-- These are not verified chef accounts. They let real chefs/home cooks submit a
-- one-page profile that can appear in customer discovery as "registration received"
-- while Soru reviews and converts them into full chef accounts.

CREATE TABLE IF NOT EXISTS public.chef_interest_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  full_name TEXT NOT NULL,
  kitchen_name TEXT,
  chef_role TEXT NOT NULL DEFAULT 'home_cook',
  city TEXT NOT NULL,
  area TEXT,
  bio TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  signature_dish TEXT,
  sample_menu TEXT,
  expected_price_range TEXT,
  fssai_status TEXT NOT NULL DEFAULT 'not_started',
  public_visible BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_interest_listings_name_check CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT chef_interest_listings_city_check CHECK (char_length(trim(city)) BETWEEN 2 AND 120),
  CONSTRAINT chef_interest_listings_status_check CHECK (
    status IN ('submitted', 'reviewing', 'invited', 'converted', 'hidden')
  ),
  CONSTRAINT chef_interest_listings_fssai_check CHECK (
    fssai_status IN ('not_started', 'need_guidance', 'in_progress', 'submitted', 'approved')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS chef_interest_listings_lead_idx
ON public.chef_interest_listings(lead_id)
WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chef_interest_listings_city_idx
ON public.chef_interest_listings(city);

CREATE INDEX IF NOT EXISTS chef_interest_listings_visible_idx
ON public.chef_interest_listings(public_visible, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chef_interest_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.chef_interest_listings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  consent_version TEXT,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_interest_contacts_name_check CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT chef_interest_contacts_email_check CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS chef_interest_contacts_listing_idx
ON public.chef_interest_contacts(listing_id);

CREATE UNIQUE INDEX IF NOT EXISTS chef_interest_contacts_phone_idx
ON public.chef_interest_contacts(normalized_phone);

CREATE UNIQUE INDEX IF NOT EXISTS chef_interest_contacts_email_idx
ON public.chef_interest_contacts(normalized_email);

DROP TRIGGER IF EXISTS set_chef_interest_listings_updated_at ON public.chef_interest_listings;
CREATE TRIGGER set_chef_interest_listings_updated_at
BEFORE UPDATE ON public.chef_interest_listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_chef_interest_contacts_updated_at ON public.chef_interest_contacts;
CREATE TRIGGER set_chef_interest_contacts_updated_at
BEFORE UPDATE ON public.chef_interest_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.chef_interest_listings TO anon, authenticated;
GRANT ALL ON public.chef_interest_listings TO service_role;
GRANT ALL ON public.chef_interest_contacts TO service_role;
GRANT SELECT, UPDATE ON public.chef_interest_contacts TO authenticated;

ALTER TABLE public.chef_interest_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_interest_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads visible chef interest listings" ON public.chef_interest_listings;
CREATE POLICY "Public reads visible chef interest listings" ON public.chef_interest_listings
FOR SELECT TO anon, authenticated
USING (public_visible = true AND status IN ('submitted', 'reviewing', 'invited'));

DROP POLICY IF EXISTS "Admins manage chef interest listings" ON public.chef_interest_listings;
CREATE POLICY "Admins manage chef interest listings" ON public.chef_interest_listings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read chef interest contacts" ON public.chef_interest_contacts;
CREATE POLICY "Admins read chef interest contacts" ON public.chef_interest_contacts
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update chef interest contacts" ON public.chef_interest_contacts;
CREATE POLICY "Admins update chef interest contacts" ON public.chef_interest_contacts
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
