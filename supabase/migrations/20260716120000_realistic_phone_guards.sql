-- Guard new production data against placeholder phone numbers.
-- Existing rows are not rewritten or deleted; NOT VALID constraints still apply to future writes.

CREATE OR REPLACE FUNCTION public.is_realistic_phone(value TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(coalesce(value, ''), '\D', '', 'g') AS digits
  )
  SELECT
    length(digits) BETWEEN 10 AND 15
    AND digits !~ '^([0-9])\1+$'
    AND length((
      SELECT string_agg(DISTINCT digit, '')
      FROM regexp_split_to_table(digits, '') AS digit
    )) >= 4
    AND right(digits, 10) NOT IN (
      '0123456789',
      '1234567890',
      '9876543210',
      '9999999999',
      '8888888888',
      '7777777777',
      '0000000000'
    )
  FROM cleaned;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_realistic_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_phone_realistic_check
      CHECK (phone IS NULL OR public.is_realistic_phone(phone)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chef_applications_phone_realistic_check'
  ) THEN
    ALTER TABLE public.chef_applications
      ADD CONSTRAINT chef_applications_phone_realistic_check
      CHECK (public.is_realistic_phone(phone)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chef_enrollments_phone_realistic_check'
  ) THEN
    ALTER TABLE public.chef_enrollments
      ADD CONSTRAINT chef_enrollments_phone_realistic_check
      CHECK (public.is_realistic_phone(phone)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_enrollments_phone_realistic_check'
  ) THEN
    ALTER TABLE public.customer_enrollments
      ADD CONSTRAINT customer_enrollments_phone_realistic_check
      CHECK (public.is_realistic_phone(phone)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_entries_phone_realistic_check'
  ) THEN
    ALTER TABLE public.waitlist_entries
      ADD CONSTRAINT waitlist_entries_phone_realistic_check
      CHECK (public.is_realistic_phone(phone)) NOT VALID;
  END IF;
END $$;
