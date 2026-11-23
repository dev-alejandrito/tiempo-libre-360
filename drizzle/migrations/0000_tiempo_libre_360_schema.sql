-- ============ TIEMPO LIBRE 360: esquema base ============
create type public.app_role as enum ('admin', 'moderator', 'user');

create or replace function public.tl_norm(s text) returns text
language sql immutable set search_path = public as $$
  select btrim(regexp_replace(regexp_replace(translate(lower(coalesce(s, '')), 'áéíóúüñàèìòù', 'aeiouunaeiou'), '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g'))
$$;

create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  headline text not null default '',
  bio text not null default '',
  city text not null default '',
  share_location boolean not null default false,
  lat double precision not null default 0,
  lng double precision not null default 0,
  availability jsonb not null default '[]'::jsonb,
  phone text not null default '',
  notify_whatsapp boolean not null default false,
  notify_sms boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
create index members_created_idx on public.members(created desc);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin', 'moderator'))
$$;
create or replace function public.is_active_member(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = _user_id and status = 'active')
$$;

grant select on public.members to authenticated;
grant update (name, headline, bio, city, share_location, lat, lng, availability) on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;
create policy "members_select_own_or_staff" on public.members for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "members_update_own" on public.members for update to authenticated
  using (id = auth.uid() and public.is_active_member(auth.uid())) with check (id = auth.uid());

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "roles_select_own_or_staff" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.tl_members_before_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.name := btrim(coalesce(new.name, ''));
  if new.name is distinct from old.name and (char_length(new.name) < 2 or char_length(new.name) > 100) then
    raise exception 'Tu nombre debe tener entre 2 y 100 caracteres.';
  end if;
  new.headline := left(btrim(coalesce(new.headline, '')), 120);
  new.bio := left(btrim(coalesce(new.bio, '')), 2000);
  new.city := left(btrim(coalesce(new.city, '')), 100);
  if jsonb_typeof(coalesce(new.availability, '[]'::jsonb)) <> 'array' then new.availability := '[]'::jsonb; end if;
  if not new.share_location then
    new.lat := 0; new.lng := 0;
  else
    new.lat := round(new.lat::numeric, 2)::double precision;
    new.lng := round(new.lng::numeric, 2)::double precision;
    if abs(new.lat) > 90 or abs(new.lng) > 180 then raise exception 'Ubicación no válida.'; end if;
  end if;
  new.updated := now();
  return new;
end $$;
create trigger tl_members_before_update before update on public.members
  for each row execute function public.tl_members_before_update();

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null default '',
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings_public_read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings_admin_insert" on public.site_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "settings_admin_update" on public.site_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "settings_admin_delete" on public.site_settings for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
insert into public.site_settings(key, value) values
  ('welcome_credits', '120'), ('max_minutes', '120'), ('late_cancel_hours', '12'),
  ('max_open_requests', '8'), ('community_open', '1'), ('site_name', 'TIEMPO LIBRE 360'), ('seeded', '1');

create table public.integrations (
  key text primary key,
  value text not null default '',
  updated timestamptz not null default now()
);
grant all on public.integrations to service_role;
alter table public.integrations enable row level security;

create table public.wallets (
  member uuid primary key references public.members(id) on delete cascade,
  available numeric(12,2) not null default 0 check (available >= 0),
  reserved numeric(12,2) not null default 0 check (reserved >= 0),
  received numeric(12,2) not null default 0,
  used numeric(12,2) not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
create policy "wallets_select_own_or_staff" on public.wallets for select to authenticated
  using (member = auth.uid() or public.is_staff(auth.uid()));

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  member uuid not null references public.members(id) on delete cascade,
  type text not null,
  avail_delta numeric(12,2) not null default 0,
  reserved_delta numeric(12,2) not null default 0,
  avail_after numeric(12,2) not null default 0,
  reserved_after numeric(12,2) not null default 0,
  idem_key text not null unique,
  note text not null default '',
  exchange uuid,
  actor uuid references public.members(id) on delete set null,
  created timestamptz not null default now()
);
create index credit_ledger_member_idx on public.credit_ledger(member, created desc);
grant select on public.credit_ledger to authenticated;
grant all on public.credit_ledger to service_role;
alter table public.credit_ledger enable row level security;
create policy "ledger_select_own_or_staff" on public.credit_ledger for select to authenticated
  using (member = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.tl_ledger_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.actor is distinct from old.actor and new.actor is null and (new.id, new.member, new.type, new.avail_delta, new.reserved_delta, new.idem_key) = (old.id, old.member, old.type, old.avail_delta, old.reserved_delta, old.idem_key) then
      return new;
    end if;
    raise exception 'Los movimientos de créditos no se pueden modificar.';
  end if;
  if exists (select 1 from public.members where id = old.member) then
    raise exception 'Los movimientos de créditos no se pueden eliminar.';
  end if;
  return old;
end $$;
create trigger tl_ledger_immutable before update or delete on public.credit_ledger
  for each row execute function public.tl_ledger_immutable();

create or replace function public.tl_wallet_nodelete() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.members where id = old.member) then
    raise exception 'Las carteras no se pueden eliminar.';
  end if;
  return old;
end $$;
create trigger tl_wallet_nodelete before delete on public.wallets
  for each row execute function public.tl_wallet_nodelete();

create or replace function public.tl_move(
  p_member uuid, p_type text, p_avail numeric, p_reserved numeric, p_received numeric, p_used numeric,
  p_key text, p_note text, p_exchange uuid, p_actor uuid
) returns public.wallets
language plpgsql security definer set search_path = public as $$
declare w public.wallets; a numeric; r numeric;
begin
  insert into public.wallets(member) values (p_member) on conflict (member) do nothing;
  select * into w from public.wallets where member = p_member for update;
  a := w.available + coalesce(p_avail, 0);
  r := w.reserved + coalesce(p_reserved, 0);
  if a < 0 then raise exception 'TL:400:No tienes suficientes créditos disponibles.'; end if;
  if r < 0 then raise exception 'TL:400:Operación inválida: no hay crédito reservado suficiente.'; end if;
  if exists (select 1 from public.credit_ledger where idem_key = p_key) then
    raise exception 'TL:400:Este movimiento de créditos ya fue registrado.';
  end if;
  insert into public.credit_ledger(member, type, avail_delta, reserved_delta, avail_after, reserved_after, idem_key, note, exchange, actor)
    values (p_member, p_type, coalesce(p_avail, 0), coalesce(p_reserved, 0), a, r, p_key, left(coalesce(p_note, ''), 300), p_exchange, p_actor);
  update public.wallets set available = a, reserved = r,
    received = received + coalesce(p_received, 0), used = used + coalesce(p_used, 0), updated = now()
    where member = p_member returning * into w;
  return w;
end $$;
revoke all on function public.tl_move(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.tl_move(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, uuid) to service_role;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('offer', 'want')),
  name text not null,
  category text not null default '',
  description text not null default '',
  level text not null default 'beginner',
  mode text not null default 'both',
  durations text not null default '',
  active boolean not null default true,
  hidden boolean not null default false,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
create index skills_owner_idx on public.skills(owner);
grant select, insert, delete on public.skills to authenticated;
grant update (name, category, description, level, mode, durations, active) on public.skills to authenticated;
grant all on public.skills to service_role;
alter table public.skills enable row level security;
create policy "skills_select_own_or_staff" on public.skills for select to authenticated
  using (owner = auth.uid() or public.is_staff(auth.uid()));
create policy "skills_insert_own" on public.skills for insert to authenticated
  with check (owner = auth.uid() and public.is_active_member(auth.uid()) and hidden = false);
create policy "skills_update_own" on public.skills for update to authenticated
  using (owner = auth.uid() and public.is_active_member(auth.uid())) with check (owner = auth.uid());
create policy "skills_delete_own" on public.skills for delete to authenticated
  using (owner = auth.uid());

create table public.exchanges (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.members(id) on delete cascade,
  provider uuid not null references public.members(id) on delete cascade,
  skill uuid references public.skills(id) on delete set null,
  skill_name text not null default '',
  category text not null default '',
  minutes integer not null,
  mode text not null default 'virtual',
  status text not null default 'pending',
  message text not null default '',
  proposed_start timestamptz,
  proposed_by uuid,
  scheduled_start timestamptz,
  requester_confirmed boolean not null default false,
  provider_confirmed boolean not null default false,
  cancelled_by uuid,
  cancel_reason text not null default '',
  late_cancel boolean not null default false,
  meeting_note text not null default '',
  meeting_url text not null default '',
  meeting_status text not null default '',
  completed_at timestamptz,
  slot_key text not null default '',
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
create index exchanges_requester_idx on public.exchanges(requester);
create index exchanges_provider_idx on public.exchanges(provider);
create unique index exchanges_slot_key_uq on public.exchanges(slot_key) where slot_key <> '';
grant select on public.exchanges to authenticated;
grant all on public.exchanges to service_role;
alter table public.exchanges enable row level security;
create policy "exchanges_select_party_or_staff" on public.exchanges for select to authenticated
  using (requester = auth.uid() or provider = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.tl_exchange_slot() returns trigger
language plpgsql set search_path = public as $$
declare t timestamptz;
begin
  if new.status in ('pending', 'negotiating', 'scheduled', 'disputed') then
    t := case when new.status = 'scheduled' then new.scheduled_start else new.proposed_start end;
    new.slot_key := case when t is null then '' else new.provider::text || '|' || to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') end;
  else
    new.slot_key := '';
  end if;
  new.updated := now();
  return new;
end $$;
create trigger tl_exchange_slot before insert or update on public.exchanges
  for each row execute function public.tl_exchange_slot();

create table public.exchange_events (
  id uuid primary key default gen_random_uuid(),
  exchange uuid not null references public.exchanges(id) on delete cascade,
  actor uuid,
  action text not null,
  note text not null default '',
  created timestamptz not null default now()
);
create index exchange_events_ex_idx on public.exchange_events(exchange, created);
grant all on public.exchange_events to service_role;
alter table public.exchange_events enable row level security;

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  exchange uuid not null references public.exchanges(id) on delete cascade,
  rater uuid not null references public.members(id) on delete cascade,
  ratee uuid not null references public.members(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text not null default '',
  created timestamptz not null default now(),
  unique (exchange, rater)
);
grant select on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;
create policy "ratings_admin_read" on public.ratings for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member uuid not null references public.members(id) on delete cascade,
  type text not null default '',
  title text not null default '',
  body text not null default '',
  link text not null default '',
  read boolean not null default false,
  ref text not null default '',
  created timestamptz not null default now()
);
create index notifications_member_idx on public.notifications(member, created desc);
grant select, delete on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif_select_own" on public.notifications for select to authenticated using (member = auth.uid());
create policy "notif_update_own" on public.notifications for update to authenticated using (member = auth.uid()) with check (member = auth.uid());
create policy "notif_delete_own" on public.notifications for delete to authenticated using (member = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.members(id) on delete cascade,
  reported uuid references public.members(id) on delete set null,
  exchange uuid references public.exchanges(id) on delete set null,
  kind text not null default 'report',
  reason text not null default '',
  details text not null default '',
  status text not null default 'open',
  resolution text not null default '',
  handled_by uuid,
  created timestamptz not null default now()
);
grant select on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports_staff_read" on public.reports for select to authenticated using (public.is_staff(auth.uid()));

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references public.members(id) on delete cascade,
  kind text not null default 'idea',
  body text not null,
  hidden boolean not null default false,
  created timestamptz not null default now()
);
grant select, insert, delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;
alter table public.community_posts enable row level security;
create policy "posts_staff_read" on public.community_posts for select to authenticated using (public.is_staff(auth.uid()) or author = auth.uid());
create policy "posts_insert_own" on public.community_posts for insert to authenticated
  with check (author = auth.uid() and public.is_active_member(auth.uid()) and hidden = false);
create policy "posts_staff_delete" on public.community_posts for delete to authenticated using (public.is_staff(auth.uid()));

create or replace function public.tl_post_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  new.body := btrim(coalesce(new.body, ''));
  if char_length(new.body) < 5 or char_length(new.body) > 500 then
    raise exception 'Tu mensaje debe tener entre 5 y 500 caracteres.';
  end if;
  if (select count(*) from public.community_posts where author = new.author and created > now() - interval '1 day') >= 10 then
    raise exception 'Has publicado mucho hoy. Vuelve mañana.';
  end if;
  return new;
end $$;
create trigger tl_post_before_insert before insert on public.community_posts
  for each row execute function public.tl_post_before_insert();

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  kind text not null,
  target numeric not null default 1,
  reward numeric not null default 0,
  badge text not null default '',
  active boolean not null default true,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
grant select, insert, update, delete on public.challenges to authenticated;
grant all on public.challenges to service_role;
alter table public.challenges enable row level security;
create policy "challenges_staff_read" on public.challenges for select to authenticated using (public.is_staff(auth.uid()));
create policy "challenges_admin_insert" on public.challenges for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "challenges_admin_update" on public.challenges for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "challenges_admin_delete" on public.challenges for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
insert into public.challenges(title, description, kind, target, reward, badge, active) values
  ('Primer intercambio', 'Completa tu primera sesión confirmada por ambas partes.', 'exchanges_completed', 1, 30, 'Pionero', true),
  ('Maestro de 5 horas', 'Comparte 300 minutos (5 horas) de tu conocimiento con la comunidad.', 'minutes_taught', 300, 60, 'Mentor', true),
  ('Aprendiz constante', 'Aprende durante 300 minutos (5 horas) con otras personas.', 'minutes_learned', 300, 60, 'Aprendiz', true),
  ('Perfil con talento', 'Registra 5 habilidades entre las que ofreces y las que quieres aprender.', 'skills_added', 5, 0, 'Polifacético', true),
  ('Comunidad que valora', 'Recibe 3 valoraciones de tus intercambios.', 'ratings_received', 3, 30, 'Reconocido', true);

create table public.challenge_claims (
  id uuid primary key default gen_random_uuid(),
  member uuid not null references public.members(id) on delete cascade,
  challenge uuid not null references public.challenges(id) on delete cascade,
  created timestamptz not null default now(),
  unique (member, challenge)
);
grant all on public.challenge_claims to service_role;
alter table public.challenge_claims enable row level security;

create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  member uuid references public.members(id) on delete cascade,
  channel text not null default '',
  recipient text not null default '',
  body text not null default '',
  status text not null default '',
  error text not null default '',
  created timestamptz not null default now()
);
grant all on public.outbound_messages to service_role;
alter table public.outbound_messages enable row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  actor_name text not null default '',
  action text not null,
  target text not null default '',
  detail text not null default '',
  created timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created desc);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit_admin_read" on public.audit_log for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create or replace function public.tl_audit_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then raise exception 'El registro de auditoría no se puede modificar.'; end if;
  raise exception 'El registro de auditoría no se puede eliminar.';
end $$;
create trigger tl_audit_immutable before update or delete on public.audit_log
  for each row execute function public.tl_audit_immutable();

create or replace function public.tl_audit_config() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nm text; rec jsonb;
begin
  if uid is null then return coalesce(new, old); end if;
  rec := to_jsonb(coalesce(new, old));
  select name into nm from public.members where id = uid;
  insert into public.audit_log(actor, actor_name, action, target, detail)
  values (uid, coalesce(nm, '—'), 'config.' || lower(tg_op) || ':' || tg_table_name, coalesce(rec->>'id', ''),
          left(coalesce(rec->>'title', rec->>'key', '') || ' ' || coalesce(rec->>'value', ''), 1000));
  return coalesce(new, old);
end $$;
create trigger tl_audit_settings after insert or update or delete on public.site_settings
  for each row execute function public.tl_audit_config();
create trigger tl_audit_challenges after insert or update or delete on public.challenges
  for each row execute function public.tl_audit_config();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  status text not null default 'new',
  read_at timestamptz,
  answered_at timestamptz,
  reply_count integer not null default 0,
  created timestamptz not null default now()
);
grant select, delete on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "contact_admin_read" on public.contact_messages for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "contact_admin_delete" on public.contact_messages for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.contact_replies (
  id uuid primary key default gen_random_uuid(),
  message uuid not null references public.contact_messages(id) on delete cascade,
  subject text not null default '',
  to_email text not null default '',
  body text not null default '',
  channel text not null default '',
  author text not null default '',
  sent_at timestamptz,
  created timestamptz not null default now()
);
grant all on public.contact_replies to service_role;
alter table public.contact_replies enable row level security;

create table public.login_attempts (
  identity text primary key,
  fails integer not null default 0,
  last_fail bigint not null default 0,
  locked_until bigint not null default 0
);
grant all on public.login_attempts to service_role;
alter table public.login_attempts enable row level security;

create table public.accreditations (
  id uuid primary key default gen_random_uuid(),
  member uuid not null references public.members(id) on delete cascade,
  skill_name text not null,
  category text not null default '',
  kind text not null default 'certificate',
  title text not null default '',
  description text not null default '',
  links text not null default '',
  member_notes text not null default '',
  status text not null default 'pending',
  feedback text not null default '',
  admin_notes text not null default '',
  reviewed_by text not null default '',
  reviewed_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
create index accreditations_member_idx on public.accreditations(member);
grant all on public.accreditations to service_role;
alter table public.accreditations enable row level security;

create or replace function public.tl_has_approved(p_member uuid, p_skill text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.accreditations where member = p_member and status = 'approved' and public.tl_norm(skill_name) = public.tl_norm(p_skill))
$$;

create or replace function public.tl_skills_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then new.updated := now(); return new; end if;
  new.name := btrim(coalesce(new.name, ''));
  if char_length(new.name) < 2 or char_length(new.name) > 80 then
    raise exception 'El nombre de la habilidad debe tener entre 2 y 80 caracteres.';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.skills where owner = new.owner) >= 40 then
    raise exception 'Has alcanzado el máximo de 40 habilidades.';
  end if;
  if new.kind = 'offer' and new.active and not public.tl_has_approved(new.owner, new.name) then
    raise exception 'Para ofrecer esta habilidad como instructor necesitas una acreditación aprobada. Presenta tu evidencia en «Mis acreditaciones».';
  end if;
  new.updated := now();
  return new;
end $$;
create trigger tl_skills_guard before insert or update on public.skills
  for each row execute function public.tl_skills_guard();

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  member uuid not null references public.members(id) on delete cascade,
  category text not null,
  subject text not null,
  description text not null,
  related_member text not null default '',
  related_exchange uuid,
  status text not null default 'new',
  thread jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  closed_at timestamptz,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
create index feedback_member_idx on public.feedback_reports(member);
grant all on public.feedback_reports to service_role;
alter table public.feedback_reports enable row level security;

create table public.private_offers (
  id uuid primary key default gen_random_uuid(),
  instructor uuid not null references public.members(id) on delete cascade,
  skill_name text not null,
  accreditation uuid references public.accreditations(id) on delete set null,
  category text not null default '',
  title text not null,
  description text not null default '',
  price_mxn numeric(10,2) not null,
  minutes integer not null,
  mode text not null,
  place text not null default '',
  availability text not null default '',
  cancel_terms text not null default '',
  active boolean not null default true,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
grant all on public.private_offers to service_role;
alter table public.private_offers enable row level security;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.members(id) on delete cascade,
  member_b uuid not null references public.members(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created timestamptz not null default now(),
  check (member_a < member_b),
  unique (member_a, member_b)
);
create index conversations_b_idx on public.conversations(member_b);
grant select on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "conv_select_participants" on public.conversations for select to authenticated
  using (auth.uid() = member_a or auth.uid() = member_b);

create table public.private_bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  offer uuid references public.private_offers(id) on delete set null,
  conversation uuid references public.conversations(id) on delete set null,
  instructor uuid not null references public.members(id) on delete cascade,
  student uuid not null references public.members(id) on delete cascade,
  skill_name text not null default '',
  title text not null default '',
  price_mxn numeric(10,2) not null default 0,
  minutes integer not null,
  mode text not null,
  place text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  terms text not null default '',
  student_note text not null default '',
  payment_note text not null default '',
  dispute_reason text not null default '',
  status text not null default 'pending',
  history jsonb not null default '[]'::jsonb,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);
create index private_bookings_instr_idx on public.private_bookings(instructor, starts_at);
create index private_bookings_student_idx on public.private_bookings(student, starts_at);
grant all on public.private_bookings to service_role;
alter table public.private_bookings enable row level security;

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation uuid not null references public.conversations(id) on delete cascade,
  sender uuid not null references public.members(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'proposal', 'system')),
  body text not null default '',
  proposal jsonb,
  proposal_status text not null default '',
  booking uuid references public.private_bookings(id) on delete set null,
  read_at timestamptz,
  created timestamptz not null default now()
);
create index chat_messages_conv_idx on public.chat_messages(conversation, created);
grant select on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "chat_select_participants" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation and (auth.uid() = c.member_a or auth.uid() = c.member_b)));
alter publication supabase_realtime add table public.chat_messages;

create or replace function public.tl_grant_owner_admin(p_uid uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(p_email, '')) = 'ortizcallesjoahann@gmail.com' then
    insert into public.user_roles(user_id, role) values (p_uid, 'admin') on conflict (user_id, role) do nothing;
  end if;
end $$;
revoke all on function public.tl_grant_owner_admin(uuid, text) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare bonus numeric := 120; raw text;
begin
  if (select count(*) from public.members where created > now() - interval '1 hour') >= 30 then
    raise exception 'Hay muchos registros en este momento. Inténtalo de nuevo en un rato.';
  end if;
  insert into public.members(id, email, name)
  values (new.id, lower(coalesce(new.email, '')),
          left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Miembro'), 100));
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.wallets(member) values (new.id) on conflict do nothing;
  select value into raw from public.site_settings where key = 'welcome_credits';
  if raw ~ '^\d+(\.\d+)?$' then bonus := raw::numeric; end if;
  if bonus > 0 then
    perform public.tl_move(new.id, 'bonus', bonus, 0, bonus, 0, 'welcome:' || new.id, 'Bienvenida a TIEMPO LIBRE 360', null, null);
  end if;
  insert into public.notifications(member, type, title, body, link)
  values (new.id, 'welcome', '¡Bienvenido a TIEMPO LIBRE 360!', 'Completa tu perfil y añade lo que sabes y lo que quieres aprender.', '/app/perfil');
  if new.email_confirmed_at is not null then perform public.tl_grant_owner_admin(new.id, new.email); end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.members set email = lower(coalesce(new.email, '')) where id = new.id;
  end if;
  if new.email_confirmed_at is not null then
    perform public.tl_grant_owner_admin(new.id, new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users
  for each row execute function public.handle_user_updated();