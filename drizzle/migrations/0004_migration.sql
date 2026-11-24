ALTER TABLE public.members ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS verified_by uuid;

CREATE OR REPLACE FUNCTION public.tl_members_verify_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if (new.verified_at is distinct from old.verified_at or new.verified_by is distinct from old.verified_by)
     and current_user in ('authenticated', 'anon') then
    raise exception 'Solo la administración puede verificar usuarios.';
  end if;
  return new;
end $$;

DROP TRIGGER IF EXISTS tl_members_verify_guard ON public.members;
CREATE TRIGGER tl_members_verify_guard BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.tl_members_verify_guard();