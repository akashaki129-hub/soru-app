-- Soru marketplace app foundation: real customer and chef accounts, menus,
-- orders, subscriptions, meal-plan intake, lunchbox requests, and FSSAI guidance.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  default_role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_default_role_check CHECK (default_role IN ('customer', 'chef', 'both')),
  CONSTRAINT profiles_name_check CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT profiles_phone_check CHECK (phone IS NULL OR char_length(trim(phone)) BETWEEN 7 AND 25),
  CONSTRAINT profiles_city_check CHECK (city IS NULL OR char_length(trim(city)) BETWEEN 2 AND 120)
);

CREATE TABLE IF NOT EXISTS public.chef_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  kitchen_name TEXT,
  chef_type TEXT NOT NULL DEFAULT 'home_cook',
  city TEXT NOT NULL,
  area TEXT,
  bio TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  service_radius_km NUMERIC(5, 1),
  fssai_status TEXT NOT NULL DEFAULT 'not_started',
  fssai_license_no TEXT,
  verification_status TEXT NOT NULL DEFAULT 'draft',
  is_listed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_profiles_type_check CHECK (
    chef_type IN ('home_cook', 'homemaker', 'culinary_student', 'professional_chef', 'caterer')
  ),
  CONSTRAINT chef_profiles_fssai_status_check CHECK (
    fssai_status IN ('not_started', 'in_progress', 'submitted', 'approved')
  ),
  CONSTRAINT chef_profiles_verification_status_check CHECK (
    verification_status IN ('draft', 'submitted', 'verified', 'rejected')
  ),
  CONSTRAINT chef_profiles_display_name_check CHECK (char_length(trim(display_name)) BETWEEN 2 AND 120),
  CONSTRAINT chef_profiles_city_check CHECK (char_length(trim(city)) BETWEEN 2 AND 120)
);

CREATE TABLE IF NOT EXISTS public.chef_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_status TEXT NOT NULL DEFAULT 'draft',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  cooking_role TEXT NOT NULL DEFAULT 'home_cook',
  experience TEXT,
  has_fssai_license BOOLEAN NOT NULL DEFAULT false,
  fssai_license_no TEXT,
  fssai_application_type TEXT NOT NULL DEFAULT 'unsure',
  documents_ready TEXT[] NOT NULL DEFAULT '{}',
  support_needed TEXT[] NOT NULL DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_applications_status_check CHECK (
    application_status IN ('draft', 'submitted', 'reviewing', 'approved', 'rejected')
  ),
  CONSTRAINT chef_applications_step_check CHECK (current_step BETWEEN 1 AND 5),
  CONSTRAINT chef_applications_license_type_check CHECK (
    fssai_application_type IN ('basic_registration', 'state_license', 'central_license', 'unsure')
  ),
  CONSTRAINT chef_applications_name_check CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT chef_applications_email_check CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TABLE IF NOT EXISTS public.chef_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_profile_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'meal',
  price_inr INTEGER NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'lunch',
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  allergens TEXT[] NOT NULL DEFAULT '{}',
  available_days TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_menu_items_price_check CHECK (price_inr BETWEEN 1 AND 100000),
  CONSTRAINT chef_menu_items_name_check CHECK (char_length(trim(name)) BETWEEN 2 AND 120)
);

CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_profile_id UUID REFERENCES public.chef_profiles(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL,
  meal_focus TEXT,
  meals_per_week INTEGER NOT NULL,
  budget_range TEXT NOT NULL,
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT,
  delivery_city TEXT NOT NULL,
  delivery_area TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_subscriptions_meals_check CHECK (meals_per_week BETWEEN 1 AND 21),
  CONSTRAINT customer_subscriptions_status_check CHECK (
    status IN ('pending', 'matched', 'active', 'paused', 'cancelled', 'completed')
  )
);

CREATE TABLE IF NOT EXISTS public.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_profile_id UUID REFERENCES public.chef_profiles(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES public.chef_menu_items(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL DEFAULT 'menu_item',
  quantity INTEGER NOT NULL DEFAULT 1,
  delivery_city TEXT NOT NULL,
  delivery_area TEXT,
  delivery_address TEXT,
  scheduled_for DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_orders_type_check CHECK (order_type IN ('menu_item', 'subscription', 'custom')),
  CONSTRAINT customer_orders_quantity_check CHECK (quantity BETWEEN 1 AND 50),
  CONSTRAINT customer_orders_status_check CHECK (
    status IN ('pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS public.meal_plan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  nutrition_focus TEXT[] NOT NULL DEFAULT '{}',
  diet_type TEXT NOT NULL DEFAULT 'flexible',
  allergies TEXT,
  meals_per_day INTEGER NOT NULL DEFAULT 2,
  budget_range TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meal_plan_requests_meals_check CHECK (meals_per_day BETWEEN 1 AND 6),
  CONSTRAINT meal_plan_requests_status_check CHECK (
    status IN ('pending', 'reviewing', 'matched', 'completed', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS public.lunchbox_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_age TEXT,
  preferences TEXT,
  dislikes TEXT,
  allergies TEXT,
  health_goals TEXT[] NOT NULL DEFAULT '{}',
  school_timing TEXT,
  budget_range TEXT NOT NULL,
  city TEXT NOT NULL,
  recommendation_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lunchbox_requests_status_check CHECK (
    status IN ('pending', 'reviewing', 'matched', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS profiles_default_role_idx ON public.profiles(default_role);
CREATE INDEX IF NOT EXISTS chef_profiles_city_idx ON public.chef_profiles(city);
CREATE INDEX IF NOT EXISTS chef_profiles_listed_idx ON public.chef_profiles(is_listed, verification_status);
CREATE INDEX IF NOT EXISTS chef_menu_items_chef_idx ON public.chef_menu_items(chef_profile_id);
CREATE INDEX IF NOT EXISTS chef_menu_items_active_idx ON public.chef_menu_items(is_active);
CREATE INDEX IF NOT EXISTS customer_orders_user_idx ON public.customer_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_orders_chef_idx ON public.customer_orders(chef_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_subscriptions_user_idx ON public.customer_subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_subscriptions_chef_idx ON public.customer_subscriptions(chef_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meal_plan_requests_user_idx ON public.meal_plan_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lunchbox_requests_user_idx ON public.lunchbox_requests(user_id, created_at DESC);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_chef_profiles_updated_at ON public.chef_profiles;
CREATE TRIGGER set_chef_profiles_updated_at
BEFORE UPDATE ON public.chef_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_chef_applications_updated_at ON public.chef_applications;
CREATE TRIGGER set_chef_applications_updated_at
BEFORE UPDATE ON public.chef_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_chef_menu_items_updated_at ON public.chef_menu_items;
CREATE TRIGGER set_chef_menu_items_updated_at
BEFORE UPDATE ON public.chef_menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customer_subscriptions_updated_at ON public.customer_subscriptions;
CREATE TRIGGER set_customer_subscriptions_updated_at
BEFORE UPDATE ON public.customer_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customer_orders_updated_at ON public.customer_orders;
CREATE TRIGGER set_customer_orders_updated_at
BEFORE UPDATE ON public.customer_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_meal_plan_requests_updated_at ON public.meal_plan_requests;
CREATE TRIGGER set_meal_plan_requests_updated_at
BEFORE UPDATE ON public.meal_plan_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lunchbox_requests_updated_at ON public.lunchbox_requests;
CREATE TRIGGER set_lunchbox_requests_updated_at
BEFORE UPDATE ON public.lunchbox_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.chef_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.chef_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chef_applications TO authenticated;
GRANT SELECT ON public.chef_menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chef_menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.meal_plan_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lunchbox_requests TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.chef_profiles TO service_role;
GRANT ALL ON public.chef_applications TO service_role;
GRANT ALL ON public.chef_menu_items TO service_role;
GRANT ALL ON public.customer_subscriptions TO service_role;
GRANT ALL ON public.customer_orders TO service_role;
GRANT ALL ON public.meal_plan_requests TO service_role;
GRANT ALL ON public.lunchbox_requests TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lunchbox_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public reads listed chef profiles" ON public.chef_profiles;
CREATE POLICY "Public reads listed chef profiles" ON public.chef_profiles
FOR SELECT TO anon, authenticated
USING (
  (is_listed = true AND verification_status IN ('submitted', 'verified'))
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Chefs manage own chef profile" ON public.chef_profiles;
CREATE POLICY "Chefs manage own chef profile" ON public.chef_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Chefs update own chef profile" ON public.chef_profiles;
CREATE POLICY "Chefs update own chef profile" ON public.chef_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Chefs manage own application" ON public.chef_applications;
CREATE POLICY "Chefs manage own application" ON public.chef_applications
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public reads active listed menu items" ON public.chef_menu_items;
CREATE POLICY "Public reads active listed menu items" ON public.chef_menu_items
FOR SELECT TO anon, authenticated
USING (
  (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.chef_profiles cp
      WHERE cp.id = chef_menu_items.chef_profile_id
      AND cp.is_listed = true
      AND cp.verification_status IN ('submitted', 'verified')
    )
  )
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Chefs manage own menu items" ON public.chef_menu_items;
CREATE POLICY "Chefs manage own menu items" ON public.chef_menu_items
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers and assigned chefs read subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Customers and assigned chefs read subscriptions" ON public.customer_subscriptions
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = customer_subscriptions.chef_profile_id
    AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers create own subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Customers create own subscriptions" ON public.customer_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers update own subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Customers update own subscriptions" ON public.customer_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers and assigned chefs read orders" ON public.customer_orders;
CREATE POLICY "Customers and assigned chefs read orders" ON public.customer_orders
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = customer_orders.chef_profile_id
    AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers create own orders" ON public.customer_orders;
CREATE POLICY "Customers create own orders" ON public.customer_orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers update own orders" ON public.customer_orders;
CREATE POLICY "Customers update own orders" ON public.customer_orders
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers manage own meal plan requests" ON public.meal_plan_requests;
CREATE POLICY "Customers manage own meal plan requests" ON public.meal_plan_requests
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers manage own lunchbox requests" ON public.lunchbox_requests;
CREATE POLICY "Customers manage own lunchbox requests" ON public.lunchbox_requests
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
