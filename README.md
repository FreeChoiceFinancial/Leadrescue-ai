# LeadRescue AI

Missed-call recovery for US owner-operated HVAC companies with about 2–15 people. A no-answer forward hits Twilio, the caller gets an informational text, and the assistant qualifies the job and books an opening.

The month-to-month price is public, with no contract: Starter $199 (150 conversations), Growth $399 (400), Premium $699 (1,000), a $99 setup fee, and $0.50 per extra conversation. Annual is a 12-month commitment at Starter $124 per month ($1,488 per year), Growth $249 per month ($2,988 per year), and Premium $437 per month ($5,244 per year). HomeGuide’s published national average for an AC repair is $360, which covers Starter. That figure is a cost benchmark, and your tickets will differ.

This repository is standalone. It does not depend on any other project.

## Run it

```bash
npm install
npm test
npm run dev
```

Then open:

- `/` marketing site
- `/pricing`, `/faq`, `/privacy`, `/terms`
- `/demo` fictional Demo HVAC Co thread (no Twilio, no card, no calendar write)
- `/signup` and `/onboarding`
- `/onboarding/10dlc` A2P registration form (review only; it does not file with Twilio)
- `/dashboard` sandbox portal with sample leads

Without credentials every integration stays in a labeled sandbox. Copy `.env.example` to `.env.local` when you connect Supabase, Twilio, Stripe test mode, Google Calendar, an LLM, or email. Do not commit secrets. This repo is public.

## What is real in code, and what is sandbox

| Piece | In this repo |
| --- | --- |
| Missed-call text, STOP/HELP, quiet hours, consent log | Real engine, tested |
| Qualification, emergency escalation, 3 follow-ups after YES | Real engine, tested |
| Booking | Demo provider by default. Google free/busy runs only with OAuth credentials |
| Assistant | Script by default. Live wording needs `LLM_LIVE=true` and `DEMO_MODE` off. An injected `OPENAI_API_KEY` stays sandbox |
| Dashboard and weekly report | Real UI. Sample data until Supabase Auth is connected |
| Stripe | Test-mode client. No call is made without `sk_test_` keys. Live keys are refused |
| HubSpot and Zoho | Coming soon. OAuth, encrypted tokens, and the sync queue stay in sandbox unless `CRM_LIVE=true` and demo mode is off |
| Tenant isolation | SQL migration plus a PGlite test that denies cross-tenant access |

## Tests and deploy

`npm test` runs unit tests, webhook tests, and the RLS test. GitHub Actions runs tests, `tsc`, and `next build`.

Netlify: `netlify.toml` uses the Next.js plugin. Set environment variables in the Netlify UI, not in git.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Compliance](docs/COMPLIANCE.md) — TCPA, per-client A2P 10DLC, CTIA, CAN-SPAM
- [Operations](docs/OPERATIONS.md) — accounts, webhooks, cron
- [Integrations](docs/INTEGRATIONS.md) — HubSpot and Zoho, coming soon
- [Roadmap](docs/ROADMAP.md) — Jobber, then Housecall Pro
- [Status](docs/STATUS.md) — done, blockers, costs, next actions

Privacy and terms pages are drafts and say so. Have a lawyer review them before launch.
