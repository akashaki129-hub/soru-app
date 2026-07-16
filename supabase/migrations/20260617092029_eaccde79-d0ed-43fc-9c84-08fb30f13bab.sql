
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.chef_role AS ENUM ('chef', 'homemaker', 'culinary_student', 'professional_chef', 'freelancer');

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- chef_enrollments
CREATE TABLE public.chef_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.chef_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.chef_enrollments TO anon, authenticated;
GRANT SELECT ON public.chef_enrollments TO authenticated;
GRANT ALL ON public.chef_enrollments TO service_role;
ALTER TABLE public.chef_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can enroll as chef" ON public.chef_enrollments
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read chef enrollments" ON public.chef_enrollments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- customer_enrollments
CREATE TABLE public.customer_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_service TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.customer_enrollments TO anon, authenticated;
GRANT SELECT ON public.customer_enrollments TO authenticated;
GRANT ALL ON public.customer_enrollments TO service_role;
ALTER TABLE public.customer_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can enroll as customer" ON public.customer_enrollments
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read customer enrollments" ON public.customer_enrollments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
