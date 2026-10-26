-- Per-shop HubSpot and Zoho connections.
-- Refresh tokens are ciphertext (v1.*). Do not log them or the sync payload.
-- Signed-in users can read status and the sync log. They cannot read tokens.

create table public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  provider text not null check (provider in ('hubspot', 'zoho')),
  status text not null default 'sandbox' check (status in ('sandbox', 'connected', 'disconnected')),
  region text check (region is null or region in ('com', 'eu', 'in', 'com.au')),
  scopes text not null default '',
  refresh_token_encrypted text check (refresh_token_encrypted is null or refresh_token_encrypted like 'v1.%'),
  access_token_encrypted text check (access_token_encrypted is null or access_token_encrypted like 'v1.%'),
  access_token_expires_at timestamptz,
  external_account_id text,
  field_mapping jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

comment on column public.crm_connections.refresh_token_encrypted is 'AES-GCM ciphertext. Do not log or select this into the browser.';

create table public.crm_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  provider text not null check (provider in ('hubspot', 'zoho')),
  idempotency_key text not null,
  lead_id uuid,
  kind text not null check (kind in ('contact', 'deal', 'note', 'appointment')),
  stage text not null check (stage in ('new', 'qualified', 'booked', 'lost')),
  message_count integer not null default 0 check (message_count >= 0),
  status text not null default 'pending' check (status in ('pending', 'sandbox', 'succeeded', 'failed')),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 8),
  next_attempt_at timestamptz not null default now(),
  external_id text check (external_id is null or (char_length(external_id) <= 64 and external_id !~ '[+@]')),
  last_error text check (last_error is null or (char_length(last_error) <= 80 and last_error !~ '[+@]')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

comment on table public.crm_sync_jobs is 'Idempotency and retry state only. No phone, email, message body, or token.';

create table public.crm_sync_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  provider text not null check (provider in ('hubspot', 'zoho')),
  action text not null,
  status text not null check (status in ('sandbox', 'succeeded', 'retry', 'failed', 'disconnected')),
  attempt integer not null default 0 check (attempt >= 0),
  detail text not null default '' check (char_length(detail) <= 80 and detail !~ '[+@]'),
  created_at timestamptz not null default now()
);

comment on table public.crm_sync_log is 'Fixed status phrases for the settings screen. Do not store caller data or tokens.';

create index crm_sync_log_tenant_idx on public.crm_sync_log (tenant_id, created_at desc);
create index crm_sync_jobs_due_idx on public.crm_sync_jobs (tenant_id, status, next_attempt_at);

create or replace function app.protect_crm_connection() returns trigger
language plpgsql
as $fn$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.refresh_token_encrypted := null;
    new.access_token_encrypted := null;
    new.status := 'sandbox';
  else
    new.refresh_token_encrypted := old.refresh_token_encrypted;
    new.access_token_encrypted := old.access_token_encrypted;
    new.access_token_expires_at := old.access_token_expires_at;
    new.status := old.status;
    new.external_account_id := old.external_account_id;
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger crm_connections_protect before insert or update on public.crm_connections
for each row execute function app.protect_crm_connection();

alter table public.crm_connections enable row level security;
alter table public.crm_connections force row level security;
alter table public.crm_sync_jobs enable row level security;
alter table public.crm_sync_jobs force row level security;
alter table public.crm_sync_log enable row level security;
alter table public.crm_sync_log force row level security;

create policy crm_connections_select on public.crm_connections for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));

create policy crm_connections_update on public.crm_connections for update to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()))
  with check (tenant_id in (select app.tenant_ids_for_user()));

create policy crm_sync_log_select on public.crm_sync_log for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));

revoke all on public.crm_connections, public.crm_sync_jobs, public.crm_sync_log from public, anon, authenticated;

grant select (
  id, tenant_id, provider, status, region, scopes, external_account_id, field_mapping, connected_at, updated_at
) on public.crm_connections to authenticated;

grant update (field_mapping, region, updated_at) on public.crm_connections to authenticated;

grant select (id, tenant_id, provider, action, status, attempt, detail, created_at) on public.crm_sync_log to authenticated;

grant select, insert, update, delete on public.crm_connections, public.crm_sync_jobs, public.crm_sync_log to service_role;
