-- One A2P 10DLC brand and campaign packet per shop.
-- The EIN is stored for a later operator submission. Do not write it to logs.
-- Signed-in users cannot mark a row submitted, approved, or rejected.

create table public.a2p_registrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  legal_business_name text not null check (char_length(legal_business_name) between 2 and 120),
  ein text not null check (ein ~ '^[0-9]{2}-[0-9]{7}$'),
  ein_last4 text generated always as (right(replace(ein, '-', ''), 4)) stored,
  business_type text not null check (business_type in (
    'Partnership',
    'Limited Liability Corporation',
    'Co-operative',
    'Non-profit Corporation',
    'Corporation'
  )),
  street text not null check (char_length(street) between 4 and 120),
  city text not null check (char_length(city) between 2 and 80),
  region text not null check (region ~ '^[A-Z]{2}$'),
  postal_code text not null check (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  country text not null default 'US' check (country = 'US'),
  website text not null check (left(website, 8) = 'https://' and char_length(website) between 12 and 200),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact_email text not null check (char_length(contact_email) between 6 and 120 and position('@' in contact_email) > 1),
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  vertical text not null check (vertical in (
    'CONSTRUCTION',
    'PROFESSIONAL',
    'CONSUMER',
    'ENERGY',
    'REAL_ESTATE',
    'RETAIL',
    'TECHNOLOGY',
    'TRANSPORTATION',
    'MANUFACTURING',
    'HEALTHCARE',
    'HOSPITALITY',
    'INSURANCE',
    'LEGAL',
    'EDUCATION',
    'GOVERNMENT',
    'NOT_FOR_PROFIT'
  )),
  use_case text not null check (use_case in ('customer_care', 'mixed')),
  campaign_description text not null check (char_length(campaign_description) between 40 and 4096),
  sample_messages text[] not null check (cardinality(sample_messages) between 2 and 5),
  opt_in_description text not null check (char_length(opt_in_description) between 40 and 2048),
  stop_message text not null check (char_length(stop_message) between 20 and 320),
  help_message text not null check (char_length(help_message) between 20 and 320),
  attested boolean not null check (attested),
  attested_at timestamptz not null default now(),
  status text not null default 'pending_review' check (status in ('pending_review', 'submitted', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.a2p_registrations.ein is 'Stored for operator review. Do not log this value. Mask it in the UI.';

create or replace function app.protect_a2p_registration() returns trigger
language plpgsql
as $fn$
declare
  sample text;
begin
  foreach sample in array new.sample_messages loop
    if sample is null or char_length(sample) < 20 or char_length(sample) > 1024 then
      raise exception 'sample message length is invalid';
    end if;
  end loop;
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;
  new.status := 'pending_review';
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger a2p_registrations_protect before insert or update on public.a2p_registrations
for each row execute function app.protect_a2p_registration();

alter table public.a2p_registrations enable row level security;
alter table public.a2p_registrations force row level security;

create policy a2p_select on public.a2p_registrations for select to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()));

create policy a2p_insert on public.a2p_registrations for insert to authenticated
  with check (
    tenant_id in (select app.tenant_ids_for_user())
    and status = 'pending_review'
    and attested
  );

create policy a2p_update on public.a2p_registrations for update to authenticated
  using (tenant_id in (select app.tenant_ids_for_user()))
  with check (
    tenant_id in (select app.tenant_ids_for_user())
    and status = 'pending_review'
    and attested
  );

grant select, insert, update on public.a2p_registrations to authenticated;
grant select, insert, update, delete on public.a2p_registrations to service_role;
