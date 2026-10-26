# Operations

## Local

```bash
npm install
npm test
npm run dev
```

Open `/` for the marketing site, `/demo` for the fictional booking path, and `/dashboard` for the sandbox portal. No `.env.local` is required for those.

Copy `.env.example` to `.env.local` only when you are ready to connect a real service. Never commit that file.

## Apply the database

The schema is `supabase/migrations/20261025120000_init.sql` plus later files in that folder, including `20261026120000_a2p_registrations.sql`. Apply them in filename order.

On a hosted Supabase project, run it with the SQL editor or the Supabase CLI against that project. Then in Authentication → URL configuration, allow `https://<your-domain>/auth/callback`.

Create the first user from `/signup`. Onboarding calls `app.bootstrap_tenant`, which inserts the tenant, the owner membership, and a 14-day trial subscription.

## Twilio

For each shop:

1. Buy or port a number under that shop's approved A2P 10DLC brand.
2. Save it as the tenant SMS number.
3. Set the voice webhook to `https://<domain>/api/twilio/voice` (HTTP POST).
4. Set the messaging webhook to `https://<domain>/api/twilio/sms`.
5. Set `TWILIO_VOICE_WEBHOOK_URL` and `TWILIO_SMS_WEBHOOK_URL` to those exact URLs. Signature checks use them.
6. On the shop's business line, enable conditional forwarding on no-answer to that Twilio number.
7. Leave `a2p_brand_status` at `not_started` or `pending` until the campaign is approved. An operator updates it with the service role. The app will not send live SMS before that.
8. The shop fills `/onboarding/10dlc`. That stores a `pending_review` row and does not call Twilio. Leave `A2P_SUBMIT_LIVE` unset. Demo mode sandboxes the adapter even if the flag is set. An operator submits the brand and campaign in Trust Hub after review, then sets the registration status with the service role.

## Stripe test mode

In the Stripe test dashboard, create the prices yourself. This app does not create products, and it refuses `sk_live_` keys.

- Month-to-month recurring prices: Starter $149, Growth $279, Pro $499.
- Annual recurring prices, billed once per year as a 12-month commitment: Starter $1,116, Growth $2,088, Pro $3,744.
- A one-time $99 setup price for month-to-month checkout. Annual checkout does not add it.
- A metered $0.40 overage price.

Put the ids in `STRIPE_PRICE_*`, including `STRIPE_PRICE_STARTER_ANNUAL`, `STRIPE_PRICE_GROWTH_ANNUAL`, and `STRIPE_PRICE_PRO_ANNUAL`. Use `sk_test_` and a test webhook secret. Point the webhook at `/api/stripe/webhook` for:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`

Checkout metadata includes `tenant_id` and `plan`. The customer portal uses the stored `stripe_customer_id`.

This build refuses `sk_live_` keys.

## HubSpot and Zoho

Both CRMs are coming soon and are listed on every plan. Leave `CRM_LIVE` unset. `DEMO_MODE` or `PUBLIC_DEMO` forces the mock adapters and the settings label `Coming soon / sandbox`. Setup steps, developer accounts, and the four Zoho data-center consoles are in [Integrations](INTEGRATIONS.md). Apply `supabase/migrations/20261026140000_crm.sql` with the other migrations. Do not log refresh tokens or caller phone numbers.

## Google Calendar

Create an OAuth client, obtain a refresh token with calendar free/busy and event scopes, and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`. Save the shop's calendar id on the tenant and set `booking_provider` to `google`. Without those, openings stay on the demo provider and are labeled sandbox.

## Assistant and email

The assistant stays on the deterministic script unless `LLM_LIVE=true` and `OPENAI_API_KEY` are both set, and `DEMO_MODE` is not on. A key injected by Netlify AI Gateway does not count. On the public demo, set `DEMO_MODE=true` so the model is never called. The rule engine still owns the stage, the emergency stop, and the slot list. If the model drops the offered times, its reply is discarded.

`RESEND_API_KEY` and `EMAIL_FROM` deliver owner emails. Otherwise the escalation is stored as sandbox.

## Cron

Call these with `Authorization: Bearer $CRON_SECRET`:

- `POST /api/cron/follow-ups` hourly.
- `POST /api/cron/weekly-report` Monday after the shops' mornings, for example 13:00 UTC.

Netlify does not run them by itself. Use Netlify scheduled functions, or any external scheduler, against the deployed URL.

## Deploy

`netlify.toml` builds with `npm run build` and the Netlify Next.js plugin. Set the same environment variables in the Netlify UI. Do not set `LEADRESCUE_ALLOW_SANDBOX_WEBHOOKS` in production.

## Health

`GET /api/health` returns each integration as `live`, `sandbox`, `test`, or `refused`. It does not return secrets.
