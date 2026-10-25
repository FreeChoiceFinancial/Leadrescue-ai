-- LeadRescue AI initial schema.
-- Authorization lives in memberships, never in user-editable JWT metadata.
-- auth.uid() is provided by Supabase. A shim is created only when it is missing
-- so this migration can also run on a plain Postgres test database.

create schema if not exists auth;
create schema if not exists app;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$roles$;

do $authuid$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create function auth.uid() returns uuid
    language sql stable
    as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
  end if;
end
$authuid$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create or replace function app.slugify(input text) returns text
language sql immutable
as $fn$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')), ''), 'business');
$fn$;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique,
  timezone text not null default 'America/Chicago',
  business_phone text,
  sms_from_number text unique,
  owner_notify_phone text,
  owner_notify_email text,
  quiet_hours_start smallint not null default 21 check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint not null default 8 check (quiet_hours_end between 0 and 23),
  booking_provider text not null default 'demo' check (booking_provider in ('demo', 'google')),
  google_calendar_id text,
  a2p_brand_status text not null default 'not_started' check (a2p_brand_status in ('not_started', 'pending', 'approved', 'rejected')),
  physical_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'growth', 'premium')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'sandbox')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  conversation_allowance integer not null default 150 check (conversation_allowance >= 0),
  conversations_used integer not null default 0 check (conversations_used >= 0),
  overage_conversations integer not null default 0 check (overage_conversations >= 0),
  setup_fee_paid boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  display_name text,
  service text not null default 'unknown' check (service in ('unknown', 'repair', 'maintenance', 'install', 'emergency')),
  status text not null default 'new' check (status in ('new', 'qualifying', 'booking', 'booked', 'escalated', 'opted_out', 'closed', 'lost')),
  source text not null check (source in ('missed_call', 'inbound_sms', 'demo')),
  opted_out boolean not null default false,
  follow_up_permission boolean not null default false,
  follow_up_asked boolean not null default false,
  follow_up_count integer not null default 0 check (follow_up_count between 0 and 3),
  next_follow_up_at timestamptz,
  emergency boolean not null default false,
  frustrated boolean not null default false,
  pending_question text,
  qualifying jsonb not null default '{}'::jsonb,
  first_inbound_at timestamptz,
  first_outbound_at timestamptz,
  recovered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  channel text not null check (channel in ('sms', 'demo')),
  stage text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  delivery text not null,
  send_after timestamptz,
  created_at timestamptz not null default now()
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  phone text not null,
  event_type text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  service text not null,
  status text not null check (status in ('booked', 'cancelled')),
  provider text not null check (provider in ('demo', 'google')),
  provider_mode text not null check (provider_mode in ('live', 'sandbox')),
  external_event_id text,
  customer_name text not null,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table public.escalations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  reason text not null check (reason in ('emergency', 'frustration')),
  summary text not null,
  owner_sms text,
  owner_email_subject text,
  owner_email_text text,
  delivery text not null check (delivery in ('live', 'sandbox')),
  created_at timestamptz not null default now()
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  canceled_reason text,
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('included', 'overage')),
  created_at timestamptz not null default now()
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  week_start date not null,
  metrics jsonb not null,
  generated_at timestamptz not null default now(),
  unique (tenant_id, week_start)
);

create index leads_tenant_idx on public.leads (tenant_id, status);
create index messages_tenant_idx on public.messages (tenant_id, created_at);
create index conversations_lead_idx on public.conversations (lead_id);
create index memberships_user_idx on public.memberships (user_id);
create index consent_events_phone_idx on public.consent_events (tenant_id, phone, created_at);
create index activity_tenant_idx on public.activity_log (tenant_id, created_at desc);

create or replace function app.touch_updated_at() returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger tenants_touch before update on public.tenants
for each row execute function app.touch_updated_at();
create trigger leads_touch before update on public.leads
for each row execute function app.touch_updated_at();
create trigger conversations_touch before update on public.conversations
for each row execute function app.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
for each row execute function app.touch_updated_at();

create or replace function app.protect_locked_tenant_columns() returns trigger
language plpgsql
as $fn$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if new.a2p_brand_status is distinct from old.a2p_brand_status then
    raise exception 'a2p brand status is operator-controlled';
  end if;
  return new;
end;
$fn$;

create trigger tenants_lock before update on public.tenants
for each row execute function app.protect_locked_tenant_columns();

create or replace function app.tenant_ids_for_user() returns setof uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select m.tenant_id from public.memberships m where m.user_id = auth.uid();
$fn$;

create or replace function app.bootstrap_tenant(
  p_name text,
  p_timezone text,
  p_business_phone text,
  p_owner_notify_phone text,
  p_owner_notify_email text,
  p_quiet_start int,
  p_quiet_end int,
  p_address text
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  tid uuid;
  base_slug text;
  chosen_slug text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.memberships where user_id = uid) then
    raise exception 'this login already has a business';
  end if;
  if p_name is null or char_length(trim(p_name)) < 2 then
    raise exception 'business name is required';
  end if;
  if p_quiet_start < 0 or p_quiet_start > 23 or p_quiet_end < 0 or p_quiet_end > 23 then
    raise exception 'quiet hours must be 0-23';
  end if;
  base_slug := app.slugify(p_name);
  chosen_slug := base_slug;
  while exists (select 1 from public.tenants as existing where existing.slug = chosen_slug) loop
    chosen_slug := base_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  end loop;
  insert into public.tenants (
    name, slug, timezone, business_phone, owner_notify_phone, owner_notify_email,
    quiet_hours_start, quiet_hours_end, physical_address
  ) values (
    trim(p_name), chosen_slug, coalesce(nullif(p_timezone, ''), 'America/Chicago'),
    p_business_phone, p_owner_notify_phone, p_owner_notify_email,
    p_quiet_start, p_quiet_end, p_address
  ) returning id into tid;
  insert into public.memberships (tenant_id, user_id, role) values (tid, uid, 'owner');
  insert into public.subscriptions (tenant_id, plan, status, trial_ends_at, conversation_allowance)
  values (tid, 'trial', 'trialing', now() + interval '14 days', 150);
  return tid;
end;
$fn$;

revoke all on function app.tenant_ids_for_user() from public;
revoke all on function app.bootstrap_tenant(text, text, text, text, text, int, int, text) from public;
grant execute on function app.tenant_ids_for_user() to authenticated;
grant execute on function app.bootstrap_tenant(text, text, text, text, text, int, int, text) to authenticated;

alter table public.tenants enable row level security;
alter table public.tenants force row level security;
alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.leads enable row level security;
alter table public.leads force row level security;
alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.consent_events enable row level security;
alter table public.consent_events force row level security;
alter table public.appointments enable row level security;
alter table public.appointments force row level security;
alter table public.activity_log enable row level security;
alter table public.activity_log force row level security;
alter table public.escalations enable row level security;
alter table public.escalations force row level security;
alter table public.follow_ups enable row level security;
alter table public.follow_ups force row level security;
alter table public.usage_events enable row level security;
alter table public.usage_events force row level security;
alter table public.weekly_reports enable row level security;
alter table public.weekly_reports force row level security;

create policy tenants_select on public.tenants for select to authenticated
  using (id in (select app.tenant_ids_for_user()));
create policy tenants_update on public.tenants for update to authenticated
  using (id in (select app.tenant_ids_for_user()))
  with check (id in (select app.tenant_ids_for_user()));

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid());

create policy leads_select on public.leads for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy leads_insert on public.leads for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));
create policy leads_update on public.leads for update to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()))
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy conversations_select on public.conversations for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));
create policy conversations_update on public.conversations for update to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()))
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy messages_select on public.messages for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy messages_insert on public.messages for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy consent_select on public.consent_events for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy consent_insert on public.consent_events for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy appointments_select on public.appointments for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));
create policy appointments_update on public.appointments for update to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()))
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy activity_select on public.activity_log for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy activity_insert on public.activity_log for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy escalations_select on public.escalations for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy escalations_insert on public.escalations for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy follow_ups_select on public.follow_ups for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));
create policy follow_ups_insert on public.follow_ups for insert to authenticated
  with check (tenant_id in (select app.tenant_ids_for_user()));
create policy follow_ups_update on public.follow_ups for update to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()))
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy usage_select on public.usage_events for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));

create policy reports_select on public.weekly_reports for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app to authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update on
  public.tenants,
  public.leads,
  public.conversations,
  public.messages,
  public.consent_events,
  public.appointments,
  public.activity_log,
  public.escalations,
  public.follow_ups
to authenticated;
grant select on public.subscriptions, public.memberships, public.usage_events, public.weekly_reports to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
