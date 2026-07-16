-- Capture feedback on customer and chef enrollments.
ALTER TABLE public.chef_enrollments
ADD COLUMN IF NOT EXISTS comments TEXT;

ALTER TABLE public.customer_enrollments
ADD COLUMN IF NOT EXISTS comments TEXT;

-- The compact homepage waitlist serves multiple audience types, so it has a
-- dedicated table instead of forcing partial records into either enrollment table.
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  role TEXT NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.waitlist_entries TO anon, authenticated;
GRANT SELECT ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_entries;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist_entries
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(name) BETWEEN 2 AND 100
  AND char_length(email) BETWEEN 3 AND 255
  AND char_length(phone) BETWEEN 7 AND 20
  AND char_length(city) BETWEEN 2 AND 100
  AND char_length(role) BETWEEN 2 AND 100
  AND (comments IS NULL OR char_length(comments) <= 1500)
);

DROP POLICY IF EXISTS "Admins read waitlist" ON public.waitlist_entries;
CREATE POLICY "Admins read waitlist" ON public.waitlist_entries
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
