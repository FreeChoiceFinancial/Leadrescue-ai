import { detectEmergency, detectFrustration, detectService } from "@/lib/assistant/detect";
import { assistantIsLive } from "@/lib/assistant/live";
import type { ServiceType } from "@/lib/domain/types";

export type AssistantDecision = {
  mode: "live" | "sandbox";
  service: ServiceType;
  emergency: boolean;
  frustrated: boolean;
  reply: string | null;
  customerName: string | null;
  chosenSlot: number | null;
  fallback: boolean;
};

export type AssistantContext = {
  tenantName: string;
  history: Array<{ direction: "inbound" | "outbound"; body: string }>;
  latest: string;
  slotLabels: string[];
};

export function openAiConfigured(): boolean {
  return assistantIsLive();
}

export async function completeWithAssistant(
  context: AssistantContext,
  ruleReply: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AssistantDecision> {
  const emergency = detectEmergency(context.latest) || context.history.some((item) => detectEmergency(item.body));
  const frustrated = detectFrustration(context.latest);
  const service = detectService(`${context.history.map((item) => item.body).join("\n")}\n${context.latest}`);
  if (!openAiConfigured()) {
    return {
      mode: "sandbox",
      service,
      emergency,
      frustrated,
      reply: null,
      customerName: null,
      chosenSlot: null,
      fallback: false,
    };
  }
  try {
    const live = await requestJsonDecision(context, fetchImpl);
    return {
      mode: "live",
      service: emergency ? "emergency" : live.service ?? service,
      emergency: emergency || Boolean(live.emergency),
      frustrated: frustrated || Boolean(live.frustrated),
      reply: emergency ? null : live.reply ?? null,
      customerName: live.customerName ?? null,
      chosenSlot: live.chosenSlot ?? null,
      fallback: false,
    };
  } catch {
    return {
      mode: "sandbox",
      service,
      emergency,
      frustrated,
      reply: ruleReply,
      customerName: null,
      chosenSlot: null,
      fallback: true,
    };
  }
}

async function requestJsonDecision(context: AssistantContext, fetchImpl: typeof fetch) {
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const response = await fetchImpl(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are the SMS receptionist for a US HVAC company. Return JSON with keys service (repair|maintenance|install|emergency|unknown), emergency (boolean), frustrated (boolean), reply (string, under 320 characters, no discounts, include no claim that a human already called), customerName (string or null), chosenSlot (0-based index or null). If the caller mentions gas, smoke, CO, or fire, set emergency true and keep reply empty. Never ignore STOP. Do not invent appointment times; only refer to the provided slot labels.",
        },
        {
          role: "user",
          content: JSON.stringify({
            business: context.tenantName,
            slots: context.slotLabels,
            history: context.history,
            latest: context.latest,
          }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Assistant request failed (${response.status}).`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Assistant returned an empty response.");
  const parsed = JSON.parse(content) as {
    service?: ServiceType;
    emergency?: boolean;
    frustrated?: boolean;
    reply?: string;
    customerName?: string | null;
    chosenSlot?: number | null;
  };
  return parsed;
}
