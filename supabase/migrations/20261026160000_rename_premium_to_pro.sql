-- The top plan is Pro. Existing premium rows become pro.

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;

update public.subscriptions set plan = 'pro' where plan = 'premium';

alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('trial', 'starter', 'growth', 'pro'));
