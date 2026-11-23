REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tl_audit_config() FROM PUBLIC, anon, authenticated;