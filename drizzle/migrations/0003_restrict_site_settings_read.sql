DROP POLICY IF EXISTS settings_public_read ON public.site_settings;

CREATE POLICY settings_public_read ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key = 'site_name' OR key LIKE 'social\_%');

CREATE POLICY settings_admin_read ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));