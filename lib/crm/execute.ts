import { hubspotLogNote, hubspotSetAppointment, hubspotUpsertContact, hubspotUpsertDeal } from "@/lib/crm/hubspot";
import type { FieldMapping, ZohoRegion } from "@/lib/crm/mapping";
import type { PlannedCrmJob } from "@/lib/crm/plan";
import type { CrmLeadSnapshot } from "@/lib/crm/snapshot";
import { zohoLogNote, zohoSetAppointment, zohoUpsertContact, zohoUpsertRecord } from "@/lib/crm/zoho";

export type LiveCrmContext = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
  region: ZohoRegion;
  fetchImpl: typeof fetch;
  now: () => number;
  mapping: FieldMapping;
  links: Map<string, string>;
  onTokens?: (tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => void;
};

function linkKey(provider: PlannedCrmJob["provider"], leadId: string, kind: "contact" | "deal"): string {
  return `${provider}:${leadId}:${kind}`;
}

export async function executeLiveJob(job: PlannedCrmJob, snapshot: CrmLeadSnapshot, ctx: LiveCrmContext): Promise<{ externalId: string }> {
  const base = {
    accessToken: ctx.accessToken,
    refreshToken: ctx.refreshToken,
    expiresAt: ctx.expiresAt,
    clientId: ctx.clientId,
    clientSecret: ctx.clientSecret,
    fetchImpl: ctx.fetchImpl,
    now: ctx.now,
    onTokens: (tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => {
      ctx.accessToken = tokens.accessToken;
      ctx.refreshToken = tokens.refreshToken;
      ctx.expiresAt = tokens.expiresAt;
      ctx.onTokens?.(tokens);
    },
  };
  if (job.provider === "zoho") {
    const zoho = { ...base, region: ctx.region };
    if (job.kind === "contact") {
      const externalId = await zohoUpsertContact(zoho, {
        phone: snapshot.phone,
        email: snapshot.email,
        name: snapshot.name,
        externalId: ctx.links.get(linkKey("zoho", job.leadId, "contact")) ?? null,
        mapping: ctx.mapping,
      });
      ctx.links.set(linkKey("zoho", job.leadId, "contact"), externalId);
      return { externalId };
    }
    if (job.kind === "deal") {
      const externalId = await zohoUpsertRecord(zoho, {
        name: snapshot.dealName,
        stage: snapshot.stage,
        externalId: ctx.links.get(linkKey("zoho", job.leadId, "deal")) ?? null,
        contactId: ctx.links.get(linkKey("zoho", job.leadId, "contact")) ?? null,
        mapping: ctx.mapping,
      });
      ctx.links.set(linkKey("zoho", job.leadId, "deal"), externalId);
      return { externalId };
    }
    if (job.kind === "appointment") {
      const recordId = ctx.links.get(linkKey("zoho", job.leadId, "deal"));
      if (!recordId || !snapshot.appointmentAt) throw new Error("CRM request failed (appointment).");
      const externalId = await zohoSetAppointment(zoho, { recordId, at: snapshot.appointmentAt, mapping: ctx.mapping });
      return { externalId };
    }
    const contactId = ctx.links.get(linkKey("zoho", job.leadId, "contact"));
    if (!contactId) throw new Error("CRM request failed (note).");
    const externalId = await zohoLogNote(zoho, { body: snapshot.note, contactId, mapping: ctx.mapping });
    return { externalId };
  }
  if (job.kind === "contact") {
    const externalId = await hubspotUpsertContact(base, {
      phone: snapshot.phone,
      email: snapshot.email,
      name: snapshot.name,
      externalId: ctx.links.get(linkKey("hubspot", job.leadId, "contact")) ?? null,
      mapping: ctx.mapping,
    });
    ctx.links.set(linkKey("hubspot", job.leadId, "contact"), externalId);
    return { externalId };
  }
  if (job.kind === "deal") {
    const externalId = await hubspotUpsertDeal(base, {
      name: snapshot.dealName,
      stage: snapshot.stage,
      externalId: ctx.links.get(linkKey("hubspot", job.leadId, "deal")) ?? null,
      contactId: ctx.links.get(linkKey("hubspot", job.leadId, "contact")) ?? null,
      mapping: ctx.mapping,
    });
    ctx.links.set(linkKey("hubspot", job.leadId, "deal"), externalId);
    return { externalId };
  }
  if (job.kind === "appointment") {
    const dealId = ctx.links.get(linkKey("hubspot", job.leadId, "deal"));
    if (!dealId || !snapshot.appointmentAt) throw new Error("CRM request failed (appointment).");
    const externalId = await hubspotSetAppointment(base, { dealId, at: snapshot.appointmentAt, mapping: ctx.mapping });
    return { externalId };
  }
  const externalId = await hubspotLogNote(base, {
    body: snapshot.note,
    contactId: ctx.links.get(linkKey("hubspot", job.leadId, "contact")) ?? null,
    mapping: ctx.mapping,
  });
  return { externalId };
}
