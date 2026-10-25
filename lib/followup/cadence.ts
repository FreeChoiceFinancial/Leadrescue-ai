import { isQuietHours, nextOpenMoment } from "@/lib/compliance/quiet-hours";
import type { Lead, Tenant } from "@/lib/domain/types";

export const FOLLOW_UP_CAP = 3;
export const FOLLOW_UP_GAP_MS = 24 * 60 * 60 * 1000;
export const FOLLOW_UP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const TERMINAL: Lead["status"][] = ["booked", "opted_out", "closed", "lost"];

export function canScheduleFollowUp(lead: Lead, at: Date): boolean {
  if (!lead.followUpPermission || lead.optedOut) return false;
  if (lead.followUpCount >= FOLLOW_UP_CAP) return false;
  if (TERMINAL.includes(lead.status)) return false;
  if (lead.emergency) return false;
  const age = at.getTime() - new Date(lead.createdAt).getTime();
  if (age > FOLLOW_UP_WINDOW_MS) return false;
  return true;
}

export function computeNextFollowUp(tenant: Tenant, lead: Lead, at: Date): Date | null {
  if (!canScheduleFollowUp(lead, at)) return null;
  let next = new Date(at.getTime() + FOLLOW_UP_GAP_MS);
  if (isQuietHours(next, tenant.timezone, tenant.quietHoursStart, tenant.quietHoursEnd)) {
    next = nextOpenMoment(next, tenant.timezone, tenant.quietHoursStart, tenant.quietHoursEnd);
  }
  return next;
}
