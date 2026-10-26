# Status

Snapshot for the MVP in this repository. No production accounts are connected here.

## Done

- Public marketing site with sourced cost and missed-call figures, a comparison page, a founding pilot for the first 5 HVAC shops, pricing, FAQ, and draft privacy and terms.
- Fictional `/demo` path from missed call to booked appointment, including gas-smell escalation and STOP. It does not call Twilio.
- Sandbox dashboard for Demo HVAC Co: leads, a lead thread, appointments, activity, consent log, weekly report, billing, and settings.
- Onboarding wizard. Without Supabase it stores a profile cookie and does not create a login.
- Domain engine: informational missed-call text, quiet hours, STOP/HELP/START, qualification, three follow-ups after YES, emergency and frustration escalation.
- Booking provider interface, demo slots, and a Google Calendar free/busy implementation that stays in sandbox without credentials.
- Stripe test-mode checkout, customer portal, webhook snapshot sync, $99 setup, $0.50 overage, 14-day trial. Live secret keys are refused.
- Supabase migration with forced RLS. Automated test denies cross-tenant access.
- GitHub Actions workflow runs tests, typecheck, and build.
- `netlify.toml` for the Next.js runtime.

## Blockers before a real shop can go live

- No Supabase project is linked. Auth, the database, and RLS are unused until you create one and apply the migration.
- No Twilio account, no 10DLC brand, and no campaign. Live SMS stays blocked until `a2p_brand_status` is approved.
- No Stripe test products or webhook endpoint.
- No Google OAuth refresh token.
- The public demo must set `DEMO_MODE=true`. The assistant stays on the script unless that flag is off and `LLM_LIVE=true`. An injected `OPENAI_API_KEY` is not treated as live.
- No Resend mailbox.
- Privacy policy and terms are drafts and still need a lawyer. The operator legal name and mailing address are placeholders.
- Cron is documented and authenticated, but nothing schedules it until you add a scheduler in the host.
- Counsel has not signed off on the missed-call consent theory.

## Costs to budget

These are public list prices to re-check before you buy. They are not quotes.

- Supabase: the free tier can hold an MVP; Pro is about $25 per month per project if you outgrow it.
- Twilio US local number: about $1.15 per month, plus roughly a cent or less per SMS segment and per inbound voice minute. A2P brand and campaign registration adds one-time and monthly carrier fees per shop.
- Stripe: 2.9% plus $0.30 per successful card charge in the US, on the subscription, setup fee, and overage invoice.
- OpenAI: a few cents per qualified thread at a small model, depending on length.
- Google Calendar API: no per-call fee for normal free/busy use.
- Netlify: the free tier can serve a preview; a paid plan is needed for commercial traffic and longer builds.
- Domain and a monitored email mailbox for CAN-SPAM.

Customer prices stay Starter $199, Growth $399, Premium $699, setup $99, overage $0.50.

## Next actions

1. Have counsel review `docs/COMPLIANCE.md`, `/privacy`, and `/terms`.
2. Create a Supabase project, apply the migration, and set the auth callback URL.
3. Create Stripe test prices and the webhook.
4. Register one pilot shop's 10DLC brand. Do not share it.
5. Connect that shop's Google Calendar and confirm a sandbox booking before flipping the provider to live.
6. Schedule the two cron routes.
7. Run one internal missed-call drill and read the consent log before inviting a customer.
