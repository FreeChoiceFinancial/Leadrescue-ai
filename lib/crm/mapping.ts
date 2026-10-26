import type { LeadStatus } from "@/lib/domain/types";

export const CRM_PROVIDERS = ["hubspot", "zoho"] as const;
export type CrmProvider = (typeof CRM_PROVIDERS)[number];

export const ZOHO_REGIONS = ["com", "eu", "in", "com.au"] as const;
export type ZohoRegion = (typeof ZOHO_REGIONS)[number];

export const CRM_STAGES = ["new", "qualified", "booked", "lost"] as const;
export type CrmStage = (typeof CRM_STAGES)[number];

export type FieldMapping = {
  phone: string;
  email: string;
  name: string;
  dealName: string;
  stageNew: string;
  stageQualified: string;
  stageBooked: string;
  stageLost: string;
  note: string;
  appointment: string;
  zohoModule: "Deals" | "Leads";
};

export function crmStageForLead(status: LeadStatus): CrmStage {
  if (status === "booked") return "booked";
  if (status === "lost" || status === "opted_out" || status === "closed") return "lost";
  if (status === "qualifying" || status === "booking" || status === "escalated") return "qualified";
  return "new";
}

export function defaultFieldMapping(provider: CrmProvider): FieldMapping {
  if (provider === "zoho") {
    return {
      phone: "Phone",
      email: "Email",
      name: "Last_Name",
      dealName: "Deal_Name",
      stageNew: "Qualification",
      stageQualified: "Needs Analysis",
      stageBooked: "Closed Won",
      stageLost: "Closed Lost",
      note: "Note_Content",
      appointment: "Appointment_Time",
      zohoModule: "Deals",
    };
  }
  return {
    phone: "phone",
    email: "email",
    name: "firstname",
    dealName: "dealname",
    stageNew: "appointmentscheduled",
    stageQualified: "qualifiedtobuy",
    stageBooked: "closedwon",
    stageLost: "closedlost",
    note: "hs_note_body",
    appointment: "appointment_time",
    zohoModule: "Deals",
  };
}

const KEYS = [
  "phone",
  "email",
  "name",
  "dealName",
  "stageNew",
  "stageQualified",
  "stageBooked",
  "stageLost",
  "note",
  "appointment",
] as const;

export function stageProperty(mapping: FieldMapping, stage: CrmStage): string {
  if (stage === "qualified") return mapping.stageQualified;
  if (stage === "booked") return mapping.stageBooked;
  if (stage === "lost") return mapping.stageLost;
  return mapping.stageNew;
}

/** Keep known string fields. Drop anything else so a client cannot store tokens here. */
export function sanitizeFieldMapping(provider: CrmProvider, input: unknown): FieldMapping {
  const defaults = defaultFieldMapping(provider);
  if (!input || typeof input !== "object") return defaults;
  const source = input as Record<string, unknown>;
  const next = { ...defaults };
  for (const key of KEYS) {
    const value = source[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, 80);
    if (trimmed) next[key] = trimmed;
  }
  if (source.zohoModule === "Leads" || source.zohoModule === "Deals") next.zohoModule = source.zohoModule;
  return next;
}
