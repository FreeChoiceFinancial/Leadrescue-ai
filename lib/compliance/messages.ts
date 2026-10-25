import type { Tenant } from "@/lib/domain/types";

/** First-touch copy is informational. It names the business and offers STOP. */
export function missedCallText(tenant: Pick<Tenant, "name">): string {
  return `${tenant.name}: We missed your call. This is an automated notice about that call, not a promotion. Reply if you still need HVAC help and we can find a time. Reply STOP to opt out. Reply HELP for help. Msg & data rates may apply.`;
}

export function helpText(tenant: Pick<Tenant, "name" | "ownerNotifyPhone" | "ownerNotifyEmail">): string {
  const contact = tenant.ownerNotifyPhone ?? tenant.ownerNotifyEmail ?? "the shop";
  return `${tenant.name}: LeadRescue sends texts only after a missed call to this shop. Message frequency varies based on your replies, with at most 3 follow-ups if you allow them. Reply STOP to opt out. For a gas leak, smoke, or CO alarm, leave and call 911. Help: ${contact}.`;
}

export function stopText(tenant: Pick<Tenant, "name">): string {
  return `${tenant.name}: You are opted out and will not receive more texts from this shop. Reply START to opt back in.`;
}

export function startText(tenant: Pick<Tenant, "name">): string {
  return `${tenant.name}: You are opted back in. Reply with the HVAC help you need. Reply STOP to opt out.`;
}

export function ensureStopReminder(body: string): string {
  if (/reply stop to opt out/i.test(body)) return body;
  return `${body} Reply STOP to opt out.`;
}
