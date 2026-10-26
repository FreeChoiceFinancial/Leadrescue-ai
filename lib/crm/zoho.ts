import type { CrmStage, FieldMapping, ZohoRegion } from "@/lib/crm/mapping";
import { stageProperty } from "@/lib/crm/mapping";
import { ZOHO_APIS } from "@/lib/crm/oauth";
import { refreshZohoToken } from "@/lib/crm/oauth";
import { safeCrmError } from "@/lib/crm/redact";

type FetchCtx = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
  region: ZohoRegion;
  fetchImpl: typeof fetch;
  now: () => number;
  onTokens?: (tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => void;
};

async function authorized(ctx: FetchCtx): Promise<string> {
  if (ctx.accessToken && ctx.expiresAt > ctx.now() + 60_000) return ctx.accessToken;
  const refreshed = await refreshZohoToken(
    { refreshToken: ctx.refreshToken, clientId: ctx.clientId, clientSecret: ctx.clientSecret, region: ctx.region },
    ctx.fetchImpl,
  );
  ctx.accessToken = refreshed.accessToken;
  ctx.refreshToken = refreshed.refreshToken;
  ctx.expiresAt = ctx.now() + refreshed.expiresIn * 1000;
  ctx.onTokens?.({ accessToken: ctx.accessToken, refreshToken: ctx.refreshToken, expiresAt: ctx.expiresAt });
  return ctx.accessToken;
}

async function zohoJson(ctx: FetchCtx, url: string, init: RequestInit): Promise<{ data?: Array<{ details?: { id?: string }; id?: string }> }> {
  const token = await authorized(ctx);
  const response = await ctx.fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(safeCrmError(response.status));
  if (response.status === 204) return {};
  return (await response.json()) as { data?: Array<{ details?: { id?: string }; id?: string }> };
}

function recordId(payload: { data?: Array<{ details?: { id?: string }; id?: string }> }): string | null {
  const row = payload.data?.[0];
  return row?.details?.id ?? row?.id ?? null;
}

export async function zohoUpsertContact(
  ctx: FetchCtx,
  contact: { phone: string; email: string | null; name: string | null; externalId: string | null; mapping: FieldMapping },
): Promise<string> {
  const fields: Record<string, string> = { [contact.mapping.phone]: contact.phone };
  if (contact.email) fields[contact.mapping.email] = contact.email;
  if (contact.name) fields[contact.mapping.name] = contact.name;
  const base = `${ZOHO_APIS[ctx.region]}/crm/v2/Contacts`;
  if (contact.externalId) {
    await zohoJson(ctx, `${base}/${contact.externalId}`, { method: "PUT", body: JSON.stringify({ data: [fields] }) });
    return contact.externalId;
  }
  const created = await zohoJson(ctx, `${base}/upsert`, { method: "POST", body: JSON.stringify({ data: [fields], duplicate_check_fields: [contact.mapping.phone] }) });
  const id = recordId(created);
  if (!id) throw new Error("CRM request failed (contact).");
  return id;
}

export async function zohoUpsertRecord(
  ctx: FetchCtx,
  deal: { name: string; stage: CrmStage; externalId: string | null; contactId: string | null; mapping: FieldMapping },
): Promise<string> {
  const moduleName = deal.mapping.zohoModule === "Leads" ? "Leads" : "Deals";
  const nameField = moduleName === "Leads" ? "Last_Name" : deal.mapping.dealName;
  const stageField = moduleName === "Leads" ? "Lead_Status" : "Stage";
  const fields: Record<string, unknown> = {
    [nameField]: deal.name,
    [stageField]: stageProperty(deal.mapping, deal.stage),
  };
  if (deal.contactId && moduleName === "Deals") fields.Contact_Name = { id: deal.contactId };
  const base = `${ZOHO_APIS[ctx.region]}/crm/v2/${moduleName}`;
  if (deal.externalId) {
    await zohoJson(ctx, `${base}/${deal.externalId}`, { method: "PUT", body: JSON.stringify({ data: [fields] }) });
    return deal.externalId;
  }
  const created = await zohoJson(ctx, `${base}/upsert`, { method: "POST", body: JSON.stringify({ data: [fields] }) });
  const id = recordId(created);
  if (!id) throw new Error("CRM request failed (deal).");
  return id;
}

export async function zohoLogNote(ctx: FetchCtx, input: { body: string; contactId: string; mapping: FieldMapping }): Promise<string> {
  const created = await zohoJson(ctx, `${ZOHO_APIS[ctx.region]}/crm/v2/Contacts/${input.contactId}/Notes`, {
    method: "POST",
    body: JSON.stringify({ data: [{ [input.mapping.note]: input.body, Note_Title: "LeadRescue texts" }] }),
  });
  return recordId(created) ?? input.contactId;
}

export async function zohoSetAppointment(ctx: FetchCtx, input: { recordId: string; at: string; mapping: FieldMapping }): Promise<string> {
  const moduleName = input.mapping.zohoModule === "Leads" ? "Leads" : "Deals";
  await zohoJson(ctx, `${ZOHO_APIS[ctx.region]}/crm/v2/${moduleName}/${input.recordId}`, {
    method: "PUT",
    body: JSON.stringify({ data: [{ [input.mapping.appointment]: input.at }] }),
  });
  return input.recordId;
}
