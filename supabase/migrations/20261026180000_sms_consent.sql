-- Optional web-form SMS consent. Unchecked stays false and has no timestamp.

alter table public.tenants
  add column sms_consent boolean not null default false,
  add column sms_consent_at timestamptz;

alter table public.a2p_registrations
  add column sms_consent boolean not null default false,
  add column sms_consent_at timestamptz;

comment on column public.tenants.sms_consent is 'Optional SMS consent from onboarding. False when the box was left unchecked.';
comment on column public.a2p_registrations.sms_consent is 'Optional SMS consent from the 10DLC contact form. False when the box was left unchecked.';
