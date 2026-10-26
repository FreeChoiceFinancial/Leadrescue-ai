# Compliance notes

This is an engineering checklist for a US HVAC missed-call product. It is not legal advice. Counsel should review the privacy policy, the terms, the first-text copy, and the consent theory before any live message is sent.

## TCPA

- LeadRescue does not text purchased lists.
- The first message is sent because that person called the shop and the call was not answered. The copy is informational: business name, the missed call, and a statement that it is not a promotion. It includes Reply STOP to opt out and Reply HELP for help.
- Conversational qualification starts only after the person replies.
- Follow-up texts require an explicit YES, are capped at 3, are at least 24 hours apart, and stop after 7 days, on opt-out, on booking, or on emergency.
- Default quiet hours are 9:00pm to 8:00am in the shop timezone. The missed-call text and follow-ups wait. A direct answer to an inbound text can go out when the person just wrote, including during quiet hours.
- Every opt-out, opt-in, help request, informational text, and quiet-hours deferral is written to `consent_events`.
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, and QUIT opt the number out and send one confirmation. Later missed calls from that number are logged and not texted.
- START and UNSTOP opt the number back in.
- Emergency language tells the caller to leave and call 911 for gas, smoke, or a CO alarm. The product is not an alarm-monitoring service.

Counsel needs to decide whether a missed call is prior express consent for this informational text in each state you operate, and whether any follow-up needs prior express written consent.

## A2P 10DLC

- Each customer registers their own brand and campaign. LeadRescue does not put every shop on one shared campaign.
- `/onboarding/10dlc` collects the brand and campaign details, including the EIN, samples, the missed-call opt-in, and STOP/HELP copy. The owner attests the information and authorizes LeadRescue AI to submit it later.
- Saving that form stores `pending_review`. It does not file anything with Twilio or the carriers. `A2P_SUBMIT_LIVE` is off, demo mode forces sandbox, and this build never calls Trust Hub.
- The EIN is stored on the tenant registration row. Do not log it. The UI shows only the last four digits.
- The shop's sending number is stored on the tenant. Live sends require `a2p_brand_status = approved`.
- That status cannot be flipped from the customer dashboard. An operator sets it after the carrier approves the campaign.
- Until then, messages are stored as `blocked_a2p` or `sandbox_not_sent` and are not handed to Twilio.
- Budget for per-brand and per-campaign carrier fees. Those are the customer's cost, not pooled across tenants.

## CTIA

- Messages identify the business.
- STOP and HELP are handled with the keyword sets above.
- Frequency is disclosed: message frequency varies, and follow-ups are numbered "1 of 3" when they are sent.
- "Msg & data rates may apply" is on the first text.
- The content is conversational about a call the person placed. There is no SHAFT content, no lead-gen resale, and no deceptive "you won" copy.

## CAN-SPAM

- Owner escalation emails and any future weekly-report email include the business name and the physical address on the tenant.
- They are operational notices to the shop, not marketing to callers.
- The from-address must be a real monitored mailbox before launch (`EMAIL_FROM`).
- SMS is governed by TCPA and carrier rules above, not by CAN-SPAM, but the same identity and opt-out habits apply.

## Data handling

- Caller phone numbers and message bodies are tenant data.
- Sandbox and `/demo` use 555-01 numbers and the fictional name Demo HVAC Co.
- Do not load a real customer extract into the demo.
