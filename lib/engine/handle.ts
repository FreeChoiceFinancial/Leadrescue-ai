import { detectEmergency, detectFrustration, detectService, extractFields, looksLikeName, parseSlotChoice } from "@/lib/assistant/detect";
import { completeWithAssistant } from "@/lib/assistant/openai";
import { meterConversation } from "@/lib/billing/plans";
import type { BookingResult } from "@/lib/booking/types";
import { classifyKeyword, isAffirmative, isNegative } from "@/lib/compliance/keywords";
import { ensureStopReminder, helpText, missedCallText, startText, stopText } from "@/lib/compliance/messages";
import { isQuietHours, nextOpenMoment } from "@/lib/compliance/quiet-hours";
import type {
  Conversation,
  ConversationStage,
  DeliveryState,
  Effects,
  Lead,
  Message,
  PendingQuestion,
  ServiceType,
  Slot,
  Workspace,
} from "@/lib/domain/types";
import {
  addActivity,
  addConsent,
  addMessage,
  cloneWorkspace,
  emptyEffects,
  newId,
  openConversation,
  upsertConversation,
  upsertLead,
} from "@/lib/engine/workspace";
import { computeNextFollowUp, FOLLOW_UP_CAP } from "@/lib/followup/cadence";

const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

export type EngineRuntime = {
  channel: "sms" | "demo";
  delivery: Extract<DeliveryState, "sent" | "sandbox_not_sent" | "blocked_a2p">;
  ids?: () => string;
  now?: Date;
  useAssistant?: boolean;
  getSlots?: (workspace: Workspace, at: Date) => Promise<Slot[]>;
  bookSlot?: (workspace: Workspace, slot: Slot, summary: string) => Promise<BookingResult>;
};

type Turn = {
  lead: Lead;
  reply: string | null;
  stage: ConversationStage;
  bookSlot: Slot | null;
  consent: "follow_up_granted" | "follow_up_declined" | null;
};

export async function handleMissedCall(
  inputWorkspace: Workspace,
  input: { from: string; at?: Date },
  runtime: EngineRuntime,
): Promise<{ workspace: Workspace; effects: Effects }> {
  const at = input.at ?? runtime.now ?? new Date();
  const iso = at.toISOString();
  let workspace = cloneWorkspace(inputWorkspace);
  const effects = emptyEffects();
  const existing = workspace.leads.find((lead) => lead.phone === input.from);

  if (existing?.optedOut) {
    return {
      workspace: addActivity(
        workspace,
        "missed_call_suppressed",
        `Missed call from opted-out ${input.from}. No text sent.`,
        iso,
        newId(runtime.ids),
      ),
      effects,
    };
  }

  if (existing && hasRecentMissedCallText(workspace, existing.id, at)) {
    return {
      workspace: addActivity(
        workspace,
        "missed_call_duplicate",
        `Duplicate missed call from ${input.from}. No additional text.`,
        iso,
        newId(runtime.ids),
      ),
      effects,
    };
  }

  let lead = existing;
  if (!lead) {
    const created = createMeteredLead(workspace, input.from, "missed_call", at, runtime);
    workspace = created.workspace;
    lead = created.lead;
  }

  const conversation = ensureConversation(workspace, lead, runtime, at);
  workspace = upsertConversation(workspace, conversation);
  const quiet = isQuietHours(at, workspace.tenant.timezone, workspace.tenant.quietHoursStart, workspace.tenant.quietHoursEnd);
  const body = missedCallText(workspace.tenant);
  const delivery: DeliveryState = quiet ? "queued_quiet_hours" : runtime.delivery;
  const sendAfter = quiet
    ? nextOpenMoment(at, workspace.tenant.timezone, workspace.tenant.quietHoursStart, workspace.tenant.quietHoursEnd).toISOString()
    : null;
  workspace = addMessage(workspace, outbound(workspace, conversation, lead, body, delivery, sendAfter, at, runtime));
  workspace = upsertConversation(workspace, { ...conversation, stage: "awaiting_reply", updatedAt: iso });
  lead = {
    ...lead,
    status: "new",
    pendingQuestion: "service",
    updatedAt: iso,
    firstOutboundAt: delivery === "queued_quiet_hours" ? lead.firstOutboundAt : (lead.firstOutboundAt ?? iso),
  };
  workspace = upsertLead(workspace, lead);
  workspace = addConsent(workspace, {
    id: newId(runtime.ids),
    leadId: lead.id,
    phone: lead.phone,
    eventType: "informational_textback",
    detail: "Informational missed-call text prepared.",
    createdAt: iso,
  });
  if (quiet) {
    workspace = addConsent(workspace, {
      id: newId(runtime.ids),
      leadId: lead.id,
      phone: lead.phone,
      eventType: "quiet_hours_deferred",
      detail: `Deferred until ${sendAfter}.`,
      createdAt: iso,
    });
  } else {
    effects.sms.push({ to: lead.phone, from: workspace.tenant.smsFromNumber, body, delivery });
  }
  workspace = addActivity(
    workspace,
    "missed_call",
    quiet
      ? `Missed call from ${lead.phone}. Text queued until quiet hours end.`
      : `Missed call from ${lead.phone}. Informational text prepared (${delivery}).`,
    iso,
    newId(runtime.ids),
  );
  return { workspace, effects };
}

export async function handleInbound(
  inputWorkspace: Workspace,
  input: { from: string; body: string; at?: Date },
  runtime: EngineRuntime,
): Promise<{ workspace: Workspace; effects: Effects }> {
  const at = input.at ?? runtime.now ?? new Date();
  const iso = at.toISOString();
  let workspace = cloneWorkspace(inputWorkspace);
  const effects = emptyEffects();
  const keyword = classifyKeyword(input.body);
  let lead = workspace.leads.find((item) => item.phone === input.from);

  if (keyword === "stop") {
    const ensured = lead
      ? { workspace, lead }
      : createUnmeteredLead(workspace, input.from, "inbound_sms", at, runtime);
    workspace = ensured.workspace;
    lead = markOptOut(ensured.lead, iso);
    const conversation = ensureConversation(workspace, lead, runtime, at);
    workspace = upsertLead(workspace, lead);
    workspace = upsertConversation(workspace, { ...conversation, stage: "opted_out", updatedAt: iso });
    workspace = addMessage(workspace, inboundMessage(workspace, conversation, lead, input.body, at, runtime));
    workspace = recordOutbound(workspace, conversation, lead, stopText(workspace.tenant), at, runtime, effects);
    workspace = addConsent(workspace, {
      id: newId(runtime.ids),
      leadId: lead.id,
      phone: lead.phone,
      eventType: "stop",
      detail: input.body.trim(),
      createdAt: iso,
    });
    workspace = cancelFollowUps(workspace, lead.id, "opt_out", iso);
    workspace = addActivity(workspace, "opt_out", `${lead.phone} opted out.`, iso, newId(runtime.ids));
    return { workspace, effects };
  }

  if (keyword === "help") {
    const ensured = lead
      ? { workspace, lead }
      : createUnmeteredLead(workspace, input.from, "inbound_sms", at, runtime);
    workspace = ensured.workspace;
    lead = ensured.lead;
    const conversation = ensureConversation(workspace, lead, runtime, at);
    workspace = upsertLead(workspace, lead);
    workspace = upsertConversation(workspace, conversation);
    workspace = addMessage(workspace, inboundMessage(workspace, conversation, lead, input.body, at, runtime));
    workspace = recordOutbound(workspace, conversation, lead, helpText(workspace.tenant), at, runtime, effects);
    workspace = addConsent(workspace, {
      id: newId(runtime.ids),
      leadId: lead.id,
      phone: lead.phone,
      eventType: "help",
      detail: input.body.trim(),
      createdAt: iso,
    });
    return { workspace, effects };
  }

  if (keyword === "start") {
    const ensured = lead
      ? { workspace, lead }
      : createUnmeteredLead(workspace, input.from, "inbound_sms", at, runtime);
    workspace = ensured.workspace;
    lead = {
      ...ensured.lead,
      optedOut: false,
      status: ensured.lead.status === "opted_out" ? "qualifying" : ensured.lead.status,
      updatedAt: iso,
    };
    const conversation = ensureConversation(workspace, lead, runtime, at);
    workspace = upsertLead(workspace, lead);
    workspace = upsertConversation(workspace, {
      ...conversation,
      stage: conversation.stage === "opted_out" ? "identify_service" : conversation.stage,
      updatedAt: iso,
    });
    workspace = addMessage(workspace, inboundMessage(workspace, conversation, lead, input.body, at, runtime));
    workspace = recordOutbound(workspace, conversation, lead, startText(workspace.tenant), at, runtime, effects);
    workspace = addConsent(workspace, {
      id: newId(runtime.ids),
      leadId: lead.id,
      phone: lead.phone,
      eventType: "start",
      detail: input.body.trim(),
      createdAt: iso,
    });
    workspace = addActivity(workspace, "opt_in", `${lead.phone} opted back in.`, iso, newId(runtime.ids));
    return { workspace, effects };
  }

  if (!lead) {
    const created = createMeteredLead(workspace, input.from, runtime.channel === "demo" ? "demo" : "inbound_sms", at, runtime);
    workspace = created.workspace;
    lead = created.lead;
  }

  if (lead.optedOut) {
    const conversation = ensureConversation(workspace, lead, runtime, at);
    workspace = upsertConversation(workspace, conversation);
    workspace = addMessage(workspace, inboundMessage(workspace, conversation, lead, input.body, at, runtime));
    workspace = addActivity(
      workspace,
      "opt_out_ignored",
      `Ignored a reply from opted-out ${lead.phone}.`,
      iso,
      newId(runtime.ids),
    );
    return { workspace, effects };
  }

  const conversation = ensureConversation(workspace, lead, runtime, at);
  workspace = upsertConversation(workspace, conversation);
  workspace = addMessage(workspace, inboundMessage(workspace, conversation, lead, input.body, at, runtime));
  if (!lead.firstInboundAt) {
    lead = { ...lead, firstInboundAt: iso, recovered: lead.source === "missed_call" || lead.source === "demo" };
  }

  if (detectEmergency(input.body)) {
    return finishEmergency(workspace, lead, conversation, input.body, at, runtime, effects);
  }

  if (detectFrustration(input.body) && !lead.frustrated) {
    const escalated = pushEscalation(workspace, lead, "frustration", input.body, at, runtime, effects);
    workspace = escalated.workspace;
    lead = { ...escalated.lead, frustrated: true };
  }

  if (lead.emergency) {
    workspace = upsertLead(workspace, { ...lead, updatedAt: iso });
    workspace = addActivity(
      workspace,
      "emergency_hold",
      `No automated reply. ${lead.phone} is already with the owner.`,
      iso,
      newId(runtime.ids),
    );
    return { workspace, effects };
  }

  const slots = await slotsFor(workspace, lead, at, runtime);
  let turn = advance(workspace, lead, input.body, slots, at);
  if (turn.stage === "escalated" && turn.lead.emergency) {
    const escalated = pushEscalation(workspace, turn.lead, "emergency", input.body, at, runtime, effects);
    workspace = escalated.workspace;
    workspace = upsertLead(workspace, { ...turn.lead, nextFollowUpAt: null });
    workspace = upsertConversation(workspace, { ...conversation, stage: "escalated", updatedAt: iso });
    workspace = recordOutbound(
      workspace,
      conversation,
      turn.lead,
      turn.reply ?? emergencyReply(workspace.tenant.name),
      at,
      runtime,
      effects,
    );
    workspace = cancelFollowUps(workspace, turn.lead.id, "emergency", iso);
    workspace = addActivity(workspace, "emergency", `Emergency escalation for ${turn.lead.phone}.`, iso, newId(runtime.ids));
    return { workspace, effects };
  }
  if (runtime.useAssistant && turn.reply && !turn.bookSlot) {
    const rewritten = await rewriteReply(workspace, lead, input.body, turn, slots);
    turn = { ...turn, reply: rewritten.reply };
    if (rewritten.note) {
      workspace = addActivity(workspace, "assistant", rewritten.note, iso, newId(runtime.ids));
    }
  }

  lead = turn.lead;
  if (turn.consent) {
    workspace = addConsent(workspace, {
      id: newId(runtime.ids),
      leadId: lead.id,
      phone: lead.phone,
      eventType: turn.consent,
      detail: input.body.trim(),
      createdAt: iso,
    });
  }

  if (turn.bookSlot) {
    const summary = `${serviceLabel(lead.service)} — ${lead.qualifying.customerName ?? lead.phone}`;
    const booked = runtime.bookSlot
      ? await runtime.bookSlot(workspace, turn.bookSlot, summary)
      : {
          externalEventId: `sandbox_${turn.bookSlot.start}`,
          mode: "sandbox" as const,
          provider: workspace.tenant.bookingProvider,
        };
    const appointment = {
      id: newId(runtime.ids),
      tenantId: workspace.tenant.id,
      leadId: lead.id,
      conversationId: conversation.id,
      startsAt: turn.bookSlot.start,
      endsAt: turn.bookSlot.end,
      service: lead.service === "unknown" ? ("repair" as ServiceType) : lead.service,
      status: "booked" as const,
      provider: booked.provider,
      providerMode: booked.mode,
      externalEventId: booked.externalEventId,
      customerName: lead.qualifying.customerName ?? lead.phone,
      createdAt: iso,
    };
    workspace = { ...workspace, appointments: [appointment, ...workspace.appointments] };
    lead = {
      ...lead,
      status: "booked",
      pendingQuestion: null,
      nextFollowUpAt: null,
      displayName: lead.qualifying.customerName ?? lead.displayName,
      updatedAt: iso,
    };
    const label = turn.bookSlot.label;
    const reply = ensureStopReminder(
      `${workspace.tenant.name}: You're booked, ${appointment.customerName} — ${serviceLabel(appointment.service)} on ${label}. We will see you then.`,
    );
    workspace = upsertLead(workspace, lead);
    workspace = upsertConversation(workspace, { ...conversation, stage: "booked", updatedAt: iso });
    workspace = recordOutbound(workspace, conversation, lead, reply, at, runtime, effects);
    workspace = cancelFollowUps(workspace, lead.id, "booked", iso);
    workspace = addActivity(
      workspace,
      "appointment_booked",
      `Booked ${appointment.customerName} for ${label} (${booked.provider}, ${booked.mode}).`,
      iso,
      newId(runtime.ids),
    );
    return { workspace, effects };
  }

  const nextFollow = lead.followUpPermission ? computeNextFollowUp(workspace.tenant, lead, at) : null;
  lead = { ...lead, nextFollowUpAt: nextFollow ? nextFollow.toISOString() : lead.followUpPermission ? lead.nextFollowUpAt : null, updatedAt: iso };
  workspace = upsertLead(workspace, lead);
  workspace = upsertConversation(workspace, { ...conversation, stage: turn.stage, updatedAt: iso });
  if (turn.reply) {
    workspace = recordOutbound(workspace, conversation, lead, ensureStopReminder(turn.reply), at, runtime, effects);
  }
  if (lead.frustrated) {
    workspace = addActivity(workspace, "frustration", `Frustration flagged for ${lead.phone}. Owner notified.`, iso, newId(runtime.ids));
  }
  return { workspace, effects };
}

export async function runDueWork(
  inputWorkspace: Workspace,
  at: Date,
  runtime: EngineRuntime,
): Promise<{ workspace: Workspace; effects: Effects }> {
  let workspace = cloneWorkspace(inputWorkspace);
  const effects = emptyEffects();
  const iso = at.toISOString();

  const released: Message[] = [];
  for (const message of workspace.messages) {
    if (message.delivery !== "queued_quiet_hours" || !message.sendAfter || new Date(message.sendAfter).getTime() > at.getTime()) {
      released.push(message);
      continue;
    }
    const lead = workspace.leads.find((item) => item.id === message.leadId);
    if (!lead || lead.optedOut) {
      released.push({ ...message, delivery: "blocked_opt_out", sendAfter: null });
      continue;
    }
    effects.sms.push({
      to: lead.phone,
      from: workspace.tenant.smsFromNumber,
      body: message.body,
      delivery: runtime.delivery,
    });
    workspace = upsertLead(workspace, {
      ...lead,
      firstOutboundAt: lead.firstOutboundAt ?? iso,
      updatedAt: iso,
    });
    released.push({ ...message, delivery: runtime.delivery, sendAfter: null });
  }
  workspace = { ...workspace, messages: released };

  for (const original of [...workspace.leads]) {
    const lead = workspace.leads.find((item) => item.id === original.id);
    if (!lead?.nextFollowUpAt) continue;
    if (new Date(lead.nextFollowUpAt).getTime() > at.getTime()) continue;
    if (lead.optedOut || !lead.followUpPermission || lead.followUpCount >= FOLLOW_UP_CAP || isTerminal(lead.status) || lead.emergency) {
      workspace = cancelFollowUps(workspace, lead.id, lead.optedOut ? "opt_out" : "no_longer_eligible", iso);
      workspace = upsertLead(workspace, { ...lead, nextFollowUpAt: null, updatedAt: iso });
      continue;
    }
    if (isQuietHours(at, workspace.tenant.timezone, workspace.tenant.quietHoursStart, workspace.tenant.quietHoursEnd)) {
      const deferred = nextOpenMoment(at, workspace.tenant.timezone, workspace.tenant.quietHoursStart, workspace.tenant.quietHoursEnd);
      workspace = upsertLead(workspace, { ...lead, nextFollowUpAt: deferred.toISOString(), updatedAt: iso });
      continue;
    }
    const conversation = ensureConversation(workspace, lead, runtime, at);
    workspace = upsertConversation(workspace, conversation);
    const body = `${workspace.tenant.name}: Still need help booking HVAC service? Reply with what you need. This is follow-up ${lead.followUpCount + 1} of ${FOLLOW_UP_CAP}. Reply STOP to opt out.`;
    workspace = recordOutbound(workspace, conversation, lead, body, at, runtime, effects);
    const updated: Lead = { ...lead, followUpCount: lead.followUpCount + 1, updatedAt: iso };
    const upcoming = computeNextFollowUp(workspace.tenant, updated, at);
    workspace = upsertLead(workspace, { ...updated, nextFollowUpAt: upcoming ? upcoming.toISOString() : null });
    workspace = {
      ...workspace,
      followUps: [
        {
          id: newId(runtime.ids),
          tenantId: workspace.tenant.id,
          leadId: lead.id,
          scheduledFor: lead.nextFollowUpAt,
          sentAt: iso,
          canceledReason: null,
          createdAt: iso,
        },
        ...workspace.followUps,
      ],
    };
    workspace = addActivity(
      workspace,
      "follow_up",
      `Sent follow-up ${updated.followUpCount} of ${FOLLOW_UP_CAP} to ${lead.phone}.`,
      iso,
      newId(runtime.ids),
    );
  }

  return { workspace, effects };
}

async function slotsFor(workspace: Workspace, lead: Lead, at: Date, runtime: EngineRuntime): Promise<Slot[]> {
  if (lead.qualifying.offeredSlots?.length) return lead.qualifying.offeredSlots;
  if (runtime.getSlots) return runtime.getSlots(workspace, at);
  const { buildCandidateSlots } = await import("@/lib/booking/slots");
  return buildCandidateSlots(at, workspace.tenant.timezone, 3);
}

function advance(workspace: Workspace, lead: Lead, body: string, slots: Slot[], at: Date): Turn {
  const tenant = workspace.tenant;
  let next: Lead = {
    ...lead,
    qualifying: { ...lead.qualifying },
    updatedAt: at.toISOString(),
  };
  const extracted = extractFields(body);
  if (extracted.systemType) next.qualifying.systemType = extracted.systemType;
  if (extracted.zip) next.qualifying.zip = extracted.zip;
  if (/\bno gas\b|\bno leak\b|\bnot urgent\b|\bno burning\b|\bno smell\b/i.test(body)) {
    next.qualifying.safetyClear = true;
  }
  const detected = detectService(body);
  if (detected !== "unknown") next.service = detected === "emergency" ? "repair" : detected;

  if (next.pendingQuestion === "safety" && (isAffirmative(body) || detectEmergency(body))) {
    next.emergency = true;
    next.service = "emergency";
    next.status = "escalated";
    next.pendingQuestion = null;
    return {
      lead: next,
      reply: emergencyReply(tenant.name),
      stage: "escalated",
      bookSlot: null,
      consent: null,
    };
  }
  if (next.pendingQuestion === "safety" && (isNegative(body) || next.qualifying.safetyClear)) {
    next.qualifying.safetyClear = true;
  }

  let consent: Turn["consent"] = null;
  if (next.pendingQuestion === "follow_up") {
    next.followUpAsked = true;
    if (isAffirmative(body)) {
      next.followUpPermission = true;
      consent = "follow_up_granted";
    } else if (isNegative(body)) {
      next.followUpPermission = false;
      consent = "follow_up_declined";
    }
  }

  if (next.pendingQuestion === "slot") {
    const choice = parseSlotChoice(body, slots.length);
    const slot = choice === null ? null : slots[choice];
    if (slot) {
      next.qualifying.slotStart = slot.start;
      next.qualifying.slotEnd = slot.end;
      next.qualifying.slotLabel = slot.label;
      next.pendingQuestion = "name";
      next.status = "booking";
      return {
        lead: next,
        reply: `${tenant.name}: What name should I put on the appointment?`,
        stage: "collect_name",
        bookSlot: null,
        consent,
      };
    }
  }

  if (next.pendingQuestion === "name" && looksLikeName(body)) {
    next.qualifying.customerName = body.trim();
    next.displayName = body.trim();
    const slot = slotFromLead(next, slots);
    return {
      lead: next,
      reply: null,
      stage: "booked",
      bookSlot: slot,
      consent,
    };
  }

  if (!next.qualifying.issue && next.pendingQuestion !== "follow_up" && !isAffirmative(body) && !isNegative(body)) {
    next.qualifying.issue = extracted.issue;
  }
  if (next.pendingQuestion === "issue") next.qualifying.issue = extracted.issue;

  const ask = (pending: PendingQuestion, stage: ConversationStage, reply: string, status: Lead["status"] = "qualifying"): Turn => ({
    lead: { ...next, pendingQuestion: pending, status },
    reply,
    stage,
    bookSlot: null,
    consent,
  });

  if (next.service === "unknown") {
    return ask("service", "identify_service", `${tenant.name}: What do you need — a repair, maintenance, or a new install?`);
  }
  if (!next.qualifying.issue && next.service === "repair") {
    return ask("issue", "qualify", `${tenant.name}: What's going on with the system?`);
  }
  if (!next.qualifying.systemType) {
    return ask("system", "qualify", `${tenant.name}: Is this a central AC, furnace, heat pump, or mini split?`);
  }
  if (!next.qualifying.zip) {
    return ask("zip", "qualify", `${tenant.name}: What ZIP code is the home in?`);
  }
  if (next.service === "repair" && next.qualifying.safetyClear !== true) {
    return ask(
      "safety",
      "qualify",
      `${tenant.name}: Any gas smell, burning, or active water leak? Reply YES if it's urgent, or NO if not.`,
    );
  }
  if (!next.followUpAsked) {
    next.followUpAsked = true;
    return ask(
      "follow_up",
      "qualify",
      `${tenant.name}: If we get disconnected, may we send up to 3 follow-up texts? Reply YES to allow that, or NO to decline.`,
    );
  }
  if (!next.qualifying.slotStart) {
    next.qualifying.offeredSlots = slots.slice(0, 3);
    const lines = next.qualifying.offeredSlots.map((slot, index) => `${index + 1}) ${slot.label}`).join("\n");
    return ask(
      "slot",
      "offer_slots",
      `${tenant.name}: I can book a ${serviceLabel(next.service)} visit. Openings:\n${lines}\nReply 1, 2, or 3.`,
      "booking",
    );
  }
  if (!next.qualifying.customerName) {
    return ask("name", "collect_name", `${tenant.name}: What name should I put on the appointment?`, "booking");
  }
  const slot = slotFromLead(next, slots);
  return { lead: next, reply: null, stage: "booked", bookSlot: slot, consent };
}

async function finishEmergency(
  workspace: Workspace,
  lead: Lead,
  conversation: Conversation,
  body: string,
  at: Date,
  runtime: EngineRuntime,
  effects: Effects,
) {
  const iso = at.toISOString();
  const escalated = pushEscalation(workspace, { ...lead, service: "emergency", emergency: true }, "emergency", body, at, runtime, effects);
  const updated: Lead = {
    ...escalated.lead,
    service: "emergency",
    emergency: true,
    status: "escalated",
    pendingQuestion: null,
    nextFollowUpAt: null,
    updatedAt: iso,
  };
  let next = escalated.workspace;
  next = upsertLead(next, updated);
  next = upsertConversation(next, { ...conversation, stage: "escalated", updatedAt: iso });
  next = recordOutbound(next, conversation, updated, emergencyReply(next.tenant.name), at, runtime, effects);
  next = cancelFollowUps(next, updated.id, "emergency", iso);
  next = addActivity(next, "emergency", `Emergency escalation for ${updated.phone}.`, iso, newId(runtime.ids));
  return { workspace: next, effects };
}

function pushEscalation(
  workspace: Workspace,
  lead: Lead,
  reason: "emergency" | "frustration",
  body: string,
  at: Date,
  runtime: EngineRuntime,
  effects: Effects,
) {
  const sms = workspace.tenant.ownerNotifyPhone
    ? `LeadRescue alert for ${workspace.tenant.name}: ${reason} from ${lead.phone}. ${body.slice(0, 160)}`
    : null;
  const email = workspace.tenant.ownerNotifyEmail
    ? {
        to: workspace.tenant.ownerNotifyEmail,
        subject: `[LeadRescue] ${reason} — ${lead.phone}`,
        text: [
          `${workspace.tenant.name} has a ${reason} escalation.`,
          `Caller: ${lead.phone}`,
          `Last message: ${body}`,
          `Call this person back yourself. Automated booking is paused for emergencies.`,
          ``,
          workspace.tenant.name,
          workspace.tenant.physicalAddress ?? "Address not on file",
          `Service notice to the business owner.`,
        ].join("\n"),
      }
    : null;
  if (sms && workspace.tenant.ownerNotifyPhone) effects.ownerSms.push({ to: workspace.tenant.ownerNotifyPhone, body: sms });
  if (email) effects.ownerEmails.push(email);
  const delivery: "live" | "sandbox" = runtime.delivery === "sent" ? "live" : "sandbox";
  return {
    workspace: {
      ...workspace,
      escalations: [
        {
          id: newId(runtime.ids),
          tenantId: workspace.tenant.id,
          leadId: lead.id,
          reason,
          summary: body.slice(0, 240),
          ownerSms: sms,
          ownerEmailSubject: email?.subject ?? null,
          ownerEmailText: email?.text ?? null,
          delivery,
          createdAt: at.toISOString(),
        },
        ...workspace.escalations,
      ],
    },
    lead,
  };
}

function emergencyReply(name: string): string {
  return `${name}: This sounds urgent. If you smell gas, see smoke, or a CO alarm is sounding, leave the building and call 911 now. I notified the owner to call you. Reply STOP to opt out.`;
}

async function rewriteReply(
  workspace: Workspace,
  lead: Lead,
  latest: string,
  turn: Turn,
  slots: Slot[],
): Promise<{ reply: string | null; note: string | null }> {
  const history = workspace.messages
    .filter((message) => message.leadId === lead.id)
    .slice(-8)
    .map((message) => ({ direction: message.direction, body: message.body }));
  const decision = await completeWithAssistant(
    {
      tenantName: workspace.tenant.name,
      history,
      latest,
      slotLabels: slots.map((slot) => slot.label),
    },
    turn.reply ?? "",
  );
  if (decision.fallback) {
    return { reply: turn.reply, note: "Assistant fell back to the sandbox script after the LLM request failed." };
  }
  if (decision.mode !== "live" || !decision.reply) return { reply: turn.reply, note: null };
  if (turn.stage === "offer_slots" && slots[0] && !decision.reply.includes(slots[0].label)) {
    return { reply: turn.reply, note: "Ignored an LLM reply that dropped the offered times." };
  }
  return { reply: ensureStopReminder(decision.reply), note: "LLM assistant wording used." };
}

function recordOutbound(
  workspace: Workspace,
  conversation: Conversation,
  lead: Lead,
  body: string,
  at: Date,
  runtime: EngineRuntime,
  effects: Effects,
): Workspace {
  const message = outbound(workspace, conversation, lead, body, runtime.delivery, null, at, runtime);
  effects.sms.push({ to: lead.phone, from: workspace.tenant.smsFromNumber, body, delivery: runtime.delivery });
  return addMessage(workspace, message);
}

function createMeteredLead(
  workspace: Workspace,
  phone: string,
  source: Lead["source"],
  at: Date,
  runtime: EngineRuntime,
) {
  const metered = meterConversation(workspace.tenant);
  const lead = baseLead(workspace.tenant.id, phone, source, at, runtime);
  return {
    lead,
    workspace: {
      ...workspace,
      tenant: metered.tenant,
      leads: [...workspace.leads, lead],
      usageEvents: [
        ...workspace.usageEvents,
        {
          id: newId(runtime.ids),
          tenantId: workspace.tenant.id,
          leadId: lead.id,
          kind: metered.kind,
          createdAt: at.toISOString(),
        },
      ],
    },
  };
}

function createUnmeteredLead(
  workspace: Workspace,
  phone: string,
  source: Lead["source"],
  at: Date,
  runtime: EngineRuntime,
) {
  const lead = baseLead(workspace.tenant.id, phone, source, at, runtime);
  return { lead, workspace: { ...workspace, leads: [...workspace.leads, lead] } };
}

function baseLead(tenantId: string, phone: string, source: Lead["source"], at: Date, runtime: EngineRuntime): Lead {
  const iso = at.toISOString();
  return {
    id: newId(runtime.ids),
    tenantId,
    phone,
    displayName: null,
    service: "unknown",
    status: "new",
    source,
    optedOut: false,
    followUpPermission: false,
    followUpAsked: false,
    followUpCount: 0,
    nextFollowUpAt: null,
    emergency: false,
    frustrated: false,
    pendingQuestion: null,
    qualifying: {},
    firstInboundAt: null,
    firstOutboundAt: null,
    recovered: false,
    createdAt: iso,
    updatedAt: iso,
  };
}

function markOptOut(lead: Lead, iso: string): Lead {
  return { ...lead, optedOut: true, status: "opted_out", pendingQuestion: null, nextFollowUpAt: null, updatedAt: iso };
}

function ensureConversation(workspace: Workspace, lead: Lead, runtime: EngineRuntime, at: Date): Conversation {
  return (
    openConversation(workspace, lead.id) ?? {
      id: newId(runtime.ids),
      tenantId: workspace.tenant.id,
      leadId: lead.id,
      channel: runtime.channel,
      stage: "awaiting_reply",
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
    }
  );
}

function outbound(
  workspace: Workspace,
  conversation: Conversation,
  lead: Lead,
  body: string,
  delivery: DeliveryState,
  sendAfter: string | null,
  at: Date,
  runtime: EngineRuntime,
): Message {
  return {
    id: newId(runtime.ids),
    tenantId: workspace.tenant.id,
    conversationId: conversation.id,
    leadId: lead.id,
    direction: "outbound",
    body,
    delivery,
    sendAfter,
    createdAt: at.toISOString(),
  };
}

function inboundMessage(
  workspace: Workspace,
  conversation: Conversation,
  lead: Lead,
  body: string,
  at: Date,
  runtime: EngineRuntime,
): Message {
  return {
    id: newId(runtime.ids),
    tenantId: workspace.tenant.id,
    conversationId: conversation.id,
    leadId: lead.id,
    direction: "inbound",
    body,
    delivery: "received",
    sendAfter: null,
    createdAt: at.toISOString(),
  };
}

function hasRecentMissedCallText(workspace: Workspace, leadId: string, at: Date): boolean {
  return workspace.messages.some(
    (message) =>
      message.leadId === leadId &&
      message.direction === "outbound" &&
      message.body.includes("We missed your call") &&
      at.getTime() - new Date(message.createdAt).getTime() < DUPLICATE_WINDOW_MS,
  );
}

function cancelFollowUps(workspace: Workspace, leadId: string, reason: string, iso: string): Workspace {
  return {
    ...workspace,
    followUps: workspace.followUps.map((followUp) =>
      followUp.leadId === leadId && !followUp.sentAt && !followUp.canceledReason
        ? { ...followUp, canceledReason: reason }
        : followUp,
    ),
    leads: workspace.leads.map((lead) => (lead.id === leadId ? { ...lead, nextFollowUpAt: null, updatedAt: iso } : lead)),
  };
}

function slotFromLead(lead: Lead, slots: Slot[]): Slot | null {
  if (lead.qualifying.slotStart && lead.qualifying.slotEnd) {
    return {
      start: lead.qualifying.slotStart,
      end: lead.qualifying.slotEnd,
      label: lead.qualifying.slotLabel ?? slots.find((slot) => slot.start === lead.qualifying.slotStart)?.label ?? "the selected time",
    };
  }
  return slots[0] ?? null;
}

function isTerminal(status: Lead["status"]): boolean {
  return status === "booked" || status === "opted_out" || status === "closed" || status === "lost";
}

function serviceLabel(service: ServiceType): string {
  if (service === "unknown") return "service";
  if (service === "emergency") return "emergency";
  return service;
}

export function serviceLabelFor(service: ServiceType): string {
  return serviceLabel(service);
}
