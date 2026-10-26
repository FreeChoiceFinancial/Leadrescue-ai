import type { FieldMapping } from "@/lib/crm/mapping";
import { stageProperty } from "@/lib/crm/mapping";
import { refreshHubSpotToken } from "@/lib/crm/oauth";
import { safeCrmError } from "@/lib/crm/redact";
import type { CrmStage } from "@/lib/crm/mapping";

export type HubSpotContact = {
  phone: string;
  email: string | null;
  name: string | null;
  externalId: string | null;
  mapping: FieldMapping;
};

export type HubSpotDeal = {
  name: string;
  stage: CrmStage;
  externalId: string | null;
  contactId: string | null;
  mapping: FieldMapping;
};

type FetchCtx = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
  fetchImpl: typeof fetch;
  now: () => number;
  onTokens?: (tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => void;
};

async function authorized(ctx: FetchCtx): Promise<string> {
  if (ctx.accessToken && ctx.expiresAt > ctx.now() + 60_000) return ctx.accessToken;
  const refreshed = await refreshHubSpotToken(
    { refreshToken: ctx.refreshToken, clientId: ctx.clientId, clientSecret: ctx.clientSecret },
    ctx.fetchImpl,
  );
  ctx.accessToken = refreshed.accessToken;
  ctx.refreshToken = refreshed.refreshToken;
  ctx.expiresAt = ctx.now() + refreshed.expiresIn * 1000;
  ctx.onTokens?.({ accessToken: ctx.accessToken, refreshToken: ctx.refreshToken, expiresAt: ctx.expiresAt });
  return ctx.accessToken;
}

async function hubspotJson(ctx: FetchCtx, url: string, init: RequestInit): Promise<{ id?: string; results?: Array<{ id: string }> }> {
  const token = await authorized(ctx);
  const response = await ctx.fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(safeCrmError(response.status));
  if (response.status === 204) return {};
  return (await response.json()) as { id?: string; results?: Array<{ id: string }> };
}

export async function hubspotUpsertContact(ctx: FetchCtx, contact: HubSpotContact): Promise<string> {
  if (contact.externalId) {
    await hubspotJson(ctx, `https://api.hubapi.com/crm/v3/objects/contacts/${contact.externalId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: contactProperties(contact) }),
    });
    return contact.externalId;
  }
  const found = await hubspotJson(ctx, "https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: contact.mapping.phone, operator: "EQ", value: contact.phone }] },
        ...(contact.email ? [{ filters: [{ propertyName: contact.mapping.email, operator: "EQ", value: contact.email }] }] : []),
      ],
      limit: 1,
    }),
  });
  const existing = found.results?.[0]?.id;
  if (existing) {
    await hubspotJson(ctx, `https://api.hubapi.com/crm/v3/objects/contacts/${existing}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: contactProperties(contact) }),
    });
    return existing;
  }
  const created = await hubspotJson(ctx, "https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties: contactProperties(contact) }),
  });
  if (!created.id) throw new Error("CRM request failed (contact).");
  return created.id;
}

function contactProperties(contact: HubSpotContact): Record<string, string> {
  const properties: Record<string, string> = { [contact.mapping.phone]: contact.phone };
  if (contact.email) properties[contact.mapping.email] = contact.email;
  if (contact.name) properties[contact.mapping.name] = contact.name;
  return properties;
}

export async function hubspotUpsertDeal(ctx: FetchCtx, deal: HubSpotDeal): Promise<string> {
  const properties = {
    [deal.mapping.dealName]: deal.name,
    dealstage: stageProperty(deal.mapping, deal.stage),
  };
  if (deal.externalId) {
    await hubspotJson(ctx, `https://api.hubapi.com/crm/v3/objects/deals/${deal.externalId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    return deal.externalId;
  }
  const created = await hubspotJson(ctx, "https://api.hubapi.com/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify({
      properties,
      ...(deal.contactId
        ? {
            associations: [
              { to: { id: deal.contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] },
            ],
          }
        : {}),
    }),
  });
  if (!created.id) throw new Error("CRM request failed (deal).");
  return created.id;
}

export async function hubspotLogNote(ctx: FetchCtx, input: { body: string; contactId: string | null; mapping: FieldMapping }): Promise<string> {
  const created = await hubspotJson(ctx, "https://api.hubapi.com/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        [input.mapping.note]: input.body,
        hs_timestamp: new Date(ctx.now()).toISOString(),
      },
      ...(input.contactId
        ? {
            associations: [
              { to: { id: input.contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] },
            ],
          }
        : {}),
    }),
  });
  if (!created.id) throw new Error("CRM request failed (note).");
  return created.id;
}

export async function hubspotSetAppointment(ctx: FetchCtx, input: { dealId: string; at: string; mapping: FieldMapping }): Promise<string> {
  await hubspotJson(ctx, `https://api.hubapi.com/crm/v3/objects/deals/${input.dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { [input.mapping.appointment]: input.at } }),
  });
  return input.dealId;
}
