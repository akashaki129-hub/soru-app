-- Keep public customer discovery aligned with Soru's verified/trusted positioning.
-- Chefs can still see and edit their own submitted profile; admins can still review all profiles.

DROP POLICY IF EXISTS "Public reads listed chef profiles" ON public.chef_profiles;
CREATE POLICY "Public reads listed chef profiles" ON public.chef_profiles
FOR SELECT TO anon, authenticated
USING (
  (is_listed = true AND verification_status = 'verified')
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

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
      AND cp.verification_status = 'verified'
    )
  )
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);
