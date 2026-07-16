-- Privacy-safe first-party traffic counts used for owner summaries.
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  path TEXT NOT NULL,
  referrer_host TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_visits_path_check CHECK (
    char_length(path) BETWEEN 1 AND 300 AND path LIKE '/%'
  ),
  CONSTRAINT site_visits_referrer_check CHECK (
    referrer_host IS NULL OR char_length(referrer_host) <= 255
  )
);

CREATE INDEX IF NOT EXISTS site_visits_visited_at_idx
ON public.site_visits (visited_at DESC);

CREATE INDEX IF NOT EXISTS site_visits_visitor_id_idx
ON public.site_visits (visitor_id, visited_at DESC);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

DROP POLICY IF EXISTS "Anyone can record a privacy-safe visit" ON public.site_visits;
CREATE POLICY "Anyone can record a privacy-safe visit" ON public.site_visits
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(path) BETWEEN 1 AND 300
  AND path LIKE '/%'
  AND (referrer_host IS NULL OR char_length(referrer_host) <= 255)
);

DROP POLICY IF EXISTS "Admins read site visits" ON public.site_visits;
CREATE POLICY "Admins read site visits" ON public.site_visits
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Durable outbox: form submissions commit first, notifications retry independently.
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  record_id UUID,
  payload JSONB NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  whatsapp_status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_event_type_check CHECK (
    event_type IN (
      'chef_enrollment',
      'customer_enrollment',
      'waitlist_entry',
      'market_feedback',
      'daily_visit_summary'
    )
  ),
  CONSTRAINT notification_email_status_check CHECK (
    email_status IN ('pending', 'sent', 'failed')
  ),
  CONSTRAINT notification_whatsapp_status_check CHECK (
    whatsapp_status IN ('pending', 'sent', 'failed')
  ),
  CONSTRAINT notification_attempts_check CHECK (attempts BETWEEN 0 AND 20)
);

CREATE INDEX IF NOT EXISTS notification_events_pending_idx
ON public.notification_events (next_attempt_at, created_at)
WHERE processed_at IS NULL;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;

DROP POLICY IF EXISTS "Admins read notification events" ON public.notification_events;
CREATE POLICY "Admins read notification events" ON public.notification_events
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

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

DROP TRIGGER IF EXISTS enqueue_chef_enrollment_notification ON public.chef_enrollments;
CREATE TRIGGER enqueue_chef_enrollment_notification
AFTER INSERT ON public.chef_enrollments
FOR EACH ROW EXECUTE FUNCTION public.enqueue_soru_notification();

DROP TRIGGER IF EXISTS enqueue_customer_enrollment_notification ON public.customer_enrollments;
CREATE TRIGGER enqueue_customer_enrollment_notification
AFTER INSERT ON public.customer_enrollments
FOR EACH ROW EXECUTE FUNCTION public.enqueue_soru_notification();

DROP TRIGGER IF EXISTS enqueue_waitlist_notification ON public.waitlist_entries;
CREATE TRIGGER enqueue_waitlist_notification
AFTER INSERT ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.enqueue_soru_notification();

DROP TRIGGER IF EXISTS enqueue_market_feedback_notification ON public.market_research_responses;
CREATE TRIGGER enqueue_market_feedback_notification
AFTER INSERT ON public.market_research_responses
FOR EACH ROW EXECUTE FUNCTION public.enqueue_soru_notification();

-- Creates a durable daily digest for the previous India calendar day.
CREATE OR REPLACE FUNCTION public.enqueue_daily_visit_digest(summary_date DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_date DATE := COALESCE(
    summary_date,
    (now() AT TIME ZONE 'Asia/Kolkata')::DATE - 1
  );
  start_at TIMESTAMPTZ := (target_date::TIMESTAMP AT TIME ZONE 'Asia/Kolkata');
  end_at TIMESTAMPTZ := ((target_date + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata');
  event_id UUID;
  digest JSONB;
BEGIN
  SELECT jsonb_build_object(
    'summary_date', target_date::TEXT,
    'page_views', COUNT(*),
    'unique_visitors', COUNT(DISTINCT visitor_id),
    'sessions', COUNT(DISTINCT session_id),
    'top_pages', COALESCE((
      SELECT jsonb_agg(page_row ORDER BY page_row.views DESC)
      FROM (
        SELECT path, COUNT(*) AS views
        FROM public.site_visits
        WHERE visited_at >= start_at AND visited_at < end_at
        GROUP BY path
        ORDER BY views DESC
        LIMIT 5
      ) AS page_row
    ), '[]'::JSONB),
    'chef_enrollments', (
      SELECT COUNT(*) FROM public.chef_enrollments
      WHERE created_at >= start_at AND created_at < end_at
    ),
    'customer_enrollments', (
      SELECT COUNT(*) FROM public.customer_enrollments
      WHERE created_at >= start_at AND created_at < end_at
    ),
    'waitlist_entries', (
      SELECT COUNT(*) FROM public.waitlist_entries
      WHERE created_at >= start_at AND created_at < end_at
    ),
    'market_feedback', (
      SELECT COUNT(*) FROM public.market_research_responses
      WHERE created_at >= start_at AND created_at < end_at
    )
  ) INTO digest
  FROM public.site_visits
  WHERE visited_at >= start_at AND visited_at < end_at;

  INSERT INTO public.notification_events (
    dedupe_key,
    event_type,
    payload
  ) VALUES (
    'daily_visit_summary:' || target_date::TEXT,
    'daily_visit_summary',
    digest
  )
  ON CONFLICT (dedupe_key) DO UPDATE SET payload = EXCLUDED.payload
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

-- Queue the previous-day summary every morning at 09:00 IST (03:30 UTC).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'soru-daily-visit-digest') THEN
    PERFORM cron.unschedule('soru-daily-visit-digest');
  END IF;
END;
$$;

SELECT cron.schedule(
  'soru-daily-visit-digest',
  '30 3 * * *',
  $$SELECT public.enqueue_daily_visit_digest();$$
);
