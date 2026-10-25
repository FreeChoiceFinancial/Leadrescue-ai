# Roadmap

The MVP recovers a missed call, qualifies it, and books a time. It does not dispatch a technician or write back to a field-service system.

## Phase 2 — Jobber

Jobber is the first field-service integration, ahead of Housecall Pro, because a large share of 2–15 person HVAC shops already live there.

- OAuth per tenant. Tokens stay server-side.
- Push a booked LeadRescue appointment into Jobber as a request or job, with the caller name, phone, ZIP, and service type.
- Pull Jobber users' working hours so the calendar provider can prefer the shop's real capacity instead of only Google free/busy.
- Map Jobber job status back onto the lead (`booked`, `closed`, `lost`) so follow-ups stop when the office takes over.
- Keep the booking provider interface. Jobber becomes a third provider next to `demo` and `google`.

Do this only after the shop's 10DLC campaign is approved and a week of sandbox bookings have been reconciled by hand.

## Then — Housecall Pro

- Same provider shape: availability in, booked job out, status back.
- Housecall Pro customers should not have to pass through Jobber. The integrations are peers behind the provider, sequenced so only one is built at a time.
- Reuse the escalation payload (emergency versus frustration) as an internal note on the Housecall Pro job.

## After those

- Per-tenant Twilio subaccounts, so a suspended brand cannot affect another shop's traffic.
- Recorded-call summaries, still with the same consent log.
- A human takeover button that pauses the assistant on one thread.
- Stronger rate limits on the public webhooks.
- Counsel-approved privacy policy and terms, then removal of the draft banners.
