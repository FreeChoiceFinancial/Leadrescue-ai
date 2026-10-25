import type { WeeklyMetrics, Workspace } from "@/lib/domain/types";

export function startOfWeek(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy;
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time < end.getTime();
}

export function buildWeeklyMetrics(workspace: Workspace, weekStart: Date): WeeklyMetrics {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const leads = workspace.leads.filter((lead) => inRange(lead.createdAt, weekStart, weekEnd));
  const responseMinutes = leads
    .filter((lead) => lead.firstOutboundAt)
    .map(
      (lead) =>
        (new Date(lead.firstOutboundAt as string).getTime() - new Date(lead.createdAt).getTime()) /
        60000,
    )
    .filter((minutes) => minutes >= 0);
  const average =
    responseMinutes.length === 0
      ? null
      : Math.round((responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length) * 10) /
        10;
  const usage = workspace.usageEvents.filter((event) => inRange(event.createdAt, weekStart, weekEnd));
  return {
    leadsHandled: leads.length,
    averageResponseMinutes: average,
    recoveredConversations: leads.filter((lead) => lead.recovered).length,
    appointmentsBooked: workspace.appointments.filter(
      (appointment) => appointment.status === "booked" && inRange(appointment.createdAt, weekStart, weekEnd),
    ).length,
    escalations: workspace.escalations.filter((item) => inRange(item.createdAt, weekStart, weekEnd)).length,
    optOuts: workspace.consentEvents.filter(
      (event) => event.eventType === "stop" && inRange(event.createdAt, weekStart, weekEnd),
    ).length,
    conversationsIncluded: usage.filter((event) => event.kind === "included").length,
    overageConversations: usage.filter((event) => event.kind === "overage").length,
  };
}
