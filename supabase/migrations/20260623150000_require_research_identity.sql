-- Require identifiable, contactable responses for all new public market research submissions.
-- Existing legacy responses remain intact and may have a null full_name.
ALTER TABLE public.market_research_responses
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.market_research_responses
DROP CONSTRAINT IF EXISTS market_research_full_name_check;

ALTER TABLE public.market_research_responses
ADD CONSTRAINT market_research_full_name_check CHECK (
  full_name IS NULL OR char_length(btrim(full_name)) BETWEEN 2 AND 100
);

ALTER TABLE public.market_research_responses
DROP CONSTRAINT IF EXISTS market_research_contact_check;

ALTER TABLE public.market_research_responses
ADD CONSTRAINT market_research_contact_check CHECK (
  contact IS NULL OR (
    char_length(contact) <= 25
    AND contact ~ '^\+?[0-9][0-9 ()-]{8,24}$'
    AND char_length(regexp_replace(contact, '\D', '', 'g')) BETWEEN 10 AND 15
  )
);

DROP POLICY IF EXISTS "Anyone can share market feedback" ON public.market_research_responses;
CREATE POLICY "Anyone can share market feedback" ON public.market_research_responses
FOR INSERT TO anon, authenticated
WITH CHECK (
  source = 'homepage_feedback_popup'
  AND full_name IS NOT NULL
  AND char_length(btrim(full_name)) BETWEEN 2 AND 100
  AND contact IS NOT NULL
  AND char_length(contact) <= 25
  AND contact ~ '^\+?[0-9][0-9 ()-]{8,24}$'
  AND char_length(regexp_replace(contact, '\D', '', 'g')) BETWEEN 10 AND 15
  AND (comments IS NULL OR char_length(comments) <= 1500)
);

CREATE OR REPLACE FUNCTION public.enqueue_soru_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_type TEXT;
  notification_payload JSONB;
BEGIN
  IF TG_TABLE_NAME = 'chef_enrollments' THEN
    notification_type := 'chef_enrollment';
    notification_payload := jsonb_build_object(
      'name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'role', NEW.role,
      'comments', NEW.comments
    );
  ELSIF TG_TABLE_NAME = 'customer_enrollments' THEN
    notification_type := 'customer_enrollment';
    notification_payload := jsonb_build_object(
      'name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'preferred_service', NEW.preferred_service,
      'comments', NEW.comments
    );
  ELSIF TG_TABLE_NAME = 'waitlist_entries' THEN
    notification_type := 'waitlist_entry';
    notification_payload := jsonb_build_object(
      'name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'city', NEW.city,
      'role', NEW.role,
      'comments', NEW.comments
    );
  ELSIF TG_TABLE_NAME = 'market_research_responses' THEN
    notification_type := 'market_feedback';
    notification_payload := jsonb_build_object(
      'full_name', NEW.full_name,
      'audience', NEW.audience,
      'city', NEW.city,
      'contact', NEW.contact,
      'statements', NEW.statements,
      'comments', NEW.comments
    );
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_events (
    dedupe_key,
    event_type,
    record_id,
    payload
  ) VALUES (
    TG_TABLE_NAME || ':' || NEW.id::TEXT,
    notification_type,
    NEW.id,
    jsonb_strip_nulls(notification_payload)
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;
