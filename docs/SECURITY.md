# Security

## Tenant isolation

- Row Level Security is enabled and forced on every public table.
- Authenticated policies require `tenant_id` to be one of `app.tenant_ids_for_user()`.
- Membership rows are visible only when `user_id = auth.uid()`, so one shop cannot list another shop's staff.
- There is no insert or update policy on `subscriptions` or `usage_events` for signed-in users. Counters move through the service role.
- A trigger rejects changes to `a2p_brand_status` unless the database role is `service_role`, `postgres`, or `supabase_admin`.
- `anon` can select and still receives zero rows, because no anon policy exists.
- Authorization does not use `user_metadata` or other user-editable JWT claims.
- `app.tenant_ids_for_user()` and `app.bootstrap_tenant()` are security definer, live in the unexposed `app` schema, and set `search_path = public`.

`tests/rls.test.ts` applies the migration to PGlite and proves:

- User A cannot read User B's leads, tenants, or memberships.
- User A cannot insert a lead into User B's tenant.
- User A cannot rename User B's tenant.
- User A cannot raise their conversation allowance.
- User A cannot self-approve A2P.
- User A can rename their own shop.
- `anon` sees nothing.
- `service_role` can read both tenants, which is how webhooks work.
- A second `bootstrap_tenant` for the same login is rejected.

## Secrets

- The repo is public. Only `.env.example` is committed. `.env` and `.env.local` are gitignored.
- `NEXT_PUBLIC_` is limited to the Supabase URL and publishable key.
- The service-role key, Twilio token, Stripe secret, OpenAI key, Google refresh token, Resend key, and cron secret are server-only.
- Webhook signatures are required whenever the matching secret is set. Missing secrets do not leave an open production endpoint: unsigned calls return 503 unless a non-production sandbox header is present. Production also requires `LEADRESCUE_ALLOW_SANDBOX_WEBHOOKS=1` for that header to work.

## App boundaries

- The browser talks to Supabase with the publishable key and the user session. RLS is the boundary.
- Stripe checkout in live mode uses the membership row of the signed-in user, not a tenant id from the request body alone. The sandbox path has no Stripe customer.
- Live Stripe secret keys (`sk_live_`) are refused.
- STOP is stored before any later send, including queued missed-call texts.

## What this MVP does not claim

- Deleting a Supabase user does not by itself revoke an already issued access token. Keep JWT expiry short.
- Service-role webhooks bypass RLS on purpose. They must keep resolving the tenant from the destination phone number or a signed Stripe metadata field.
- There is no penetration test in this repository. The RLS test is necessary and not sufficient.
