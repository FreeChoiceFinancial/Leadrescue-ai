# CRM integrations

HubSpot and Zoho CRM are included on Starter, Growth, and Pro. The connection is **coming soon**. This build does not perform a live sync unless an operator sets `CRM_LIVE=true` and demo mode is off. The settings screen says `Coming soon / sandbox` while the flag is off. Pricing and the FAQ say coming soon. Do not describe a shop as connected to a live CRM.

## Developer accounts

### HubSpot

1. Create a [HubSpot developer account](https://developers.hubspot.com/).
2. Create a public OAuth app. A private app is not enough for the per-shop connect button.
3. Redirect URL: `{NEXT_PUBLIC_APP_URL}/api/crm/hubspot/callback`
4. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`, `crm.objects.notes.write`, and `timeline`.
5. Copy the client id and secret into the host environment as `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET`. Leave them blank in git.

### Zoho CRM

1. Create a Zoho account and a Server-based client in the [Zoho API Console](https://api-console.zoho.com/) for each data center a shop will use. The consoles are separate:
   - `.com` — `https://api-console.zoho.com/`
   - `.eu` — `https://api-console.zoho.eu/`
   - `.in` — `https://api-console.zoho.in/`
   - `.com.au` — `https://api-console.zoho.com.au/`
2. Redirect URL: `{NEXT_PUBLIC_APP_URL}/api/crm/zoho/callback`
3. Scopes: `ZohoCRM.modules.contacts.ALL`, `ZohoCRM.modules.deals.ALL`, `ZohoCRM.modules.leads.ALL`, `ZohoCRM.modules.notes.ALL`.
4. The shop picks a region in settings. Authorize and token calls use that region's accounts host (`accounts.zoho.com`, `accounts.zoho.eu`, `accounts.zoho.in`, or `accounts.zoho.com.au`). CRM calls use the matching `zohoapis` host.
5. Copy the client id and secret into `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET`.

### Shared

- Apply `supabase/migrations/20261026140000_crm.sql` with the rest of the Supabase migrations.
- `CRM_TOKEN_KEY` is 32 bytes of base64 (`openssl rand -base64 32`). It encrypts refresh tokens at rest. Without it, connect stays in sandbox.
- `CRM_LIVE` stays unset or `false`. `true` is the only value that can send traffic, and `DEMO_MODE` or `PUBLIC_DEMO` still forces the mock path.
- The OAuth callback uses the Supabase service role to store ciphertext. Signed-in users can read connection status and the sync log. They cannot read token columns.

## What a live sync would do

When the flag is on and a shop has completed OAuth:

- Upsert the caller as a contact by phone. Leads in this app store a phone number, not an email. The email field is mapped for a future value and is omitted when empty.
- Create or update a HubSpot deal, or a Zoho Deal or Lead, using the shop's field mapping. Stages are `new`, `qualified`, `booked`, and `lost`.
- Log the SMS thread as a note on the contact.
- Write the booked appointment time onto the deal or lead.
- Refresh the access token when it is missing or within a minute of expiry, then store the new ciphertext.
- The queue key is provider, lead, kind, stage, and message count. A repeated event does not send again after success. Failures wait one minute, then double, up to six hours, and stop after five attempts.
- Disconnect calls the provider revoke endpoint and clears the stored tokens. The settings log says `Tokens cleared.`

The dashboard settings page lists the sync log for that shop. The lines are fixed phrases: `Not sent.`, `Accepted.`, `Will retry.`, `Stopped.`, and `Tokens cleared.`

## What is not stored in the log

Job rows store the idempotency key, lead id, kind, stage, attempt count, and a CRM record id. They do not store the caller phone, email, message body, or token. Log rows do not either. Application logs must not print tokens or caller data. Sandbox mode does not call HubSpot or Zoho.

Field-mapping defaults are editable per shop. Unknown keys are dropped so a mapping cannot hold a token. Zoho can target Deals (the default) or Leads.
