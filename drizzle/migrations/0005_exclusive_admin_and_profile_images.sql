CREATE OR REPLACE FUNCTION public.tl_grant_owner_admin(p_uid uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_uid = '0f706948-fc0b-4626-b989-4455e8de6b83'::uuid AND lower(coalesce(p_email,'')) = 'alejandroortizcalles@gmail.com'
     AND EXISTS (SELECT 1 FROM auth.users WHERE id=p_uid AND lower(email)='alejandroortizcalles@gmail.com' AND email_confirmed_at IS NOT NULL) THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(p_uid,'admin') ON CONFLICT(user_id,role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id=p_uid AND role='admin';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.tl_grant_owner_admin(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tl_grant_owner_admin(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.tl_exclusive_admin_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role='admin' AND (NEW.user_id <> '0f706948-fc0b-4626-b989-4455e8de6b83'::uuid OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=NEW.user_id AND lower(email)='alejandroortizcalles@gmail.com' AND email_confirmed_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'Solo la cuenta administradora autorizada puede recibir este rol.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tl_exclusive_admin_guard BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.tl_exclusive_admin_guard();
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS avatar_path text NOT NULL DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS cover_path text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.tl_profile_image_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.avatar_path <> '' AND (NEW.avatar_path NOT LIKE NEW.id::text || '/profile/%' OR NEW.avatar_path LIKE '%..%' OR NEW.avatar_path !~ '\.(jpg|jpeg|png|webp)$') THEN RAISE EXCEPTION 'Fotografía no válida.'; END IF;
  IF NEW.cover_path <> '' AND (NEW.cover_path NOT LIKE NEW.id::text || '/profile/%' OR NEW.cover_path LIKE '%..%' OR NEW.cover_path !~ '\.(jpg|jpeg|png|webp)$') THEN RAISE EXCEPTION 'Portada no válida.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tl_profile_image_guard BEFORE INSERT OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.tl_profile_image_guard();