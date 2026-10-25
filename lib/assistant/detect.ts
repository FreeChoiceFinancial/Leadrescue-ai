import type { ServiceType } from "@/lib/domain/types";

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bgas leak\b/i,
  /\bsmell(?:s|ed|ing)? gas\b/i,
  /\bcarbon monoxide\b/i,
  /\bco alarm\b/i,
  /\bco detector\b/i,
  /\bburning smell\b/i,
  /\bsmoke\b/i,
  /\bsparking\b/i,
  /\belectrical fire\b/i,
  /\bflood(?:ing|ed)?\b/i,
  /\bno heat\b/i,
  /\bfreezing pipes\b/i,
];

const FRUSTRATION_PATTERNS: RegExp[] = [
  /\bridiculous\b/i,
  /\bterrible\b/i,
  /\bunacceptable\b/i,
  /\bfurious\b/i,
  /\bpissed\b/i,
  /\blawyer\b/i,
  /\bmanager\b/i,
  /\bworst\b/i,
  /\bthis is crazy\b/i,
  /\bscam\b/i,
];

export function detectEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

export function detectFrustration(text: string): boolean {
  if (FRUSTRATION_PATTERNS.some((pattern) => pattern.test(text))) return true;
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 12 && letters === letters.toUpperCase()) return true;
  return false;
}

export function detectService(text: string): ServiceType {
  if (detectEmergency(text)) return "emergency";
  if (/\b(install|replacement|replace|new system|estimate|quote)\b/i.test(text)) return "install";
  if (/\b(maintenance|tune[\s-]?up|check[\s-]?up|seasonal|filter change|service plan)\b/i.test(text)) {
    return "maintenance";
  }
  if (
    /\b(repair|fix|broken|not cooling|isn't cooling|isnt cooling|won't cool|wont cool|not heating|warm air|blowing warm|no cool|leak|tripped|won't turn on|wont turn on)\b/i.test(
      text,
    )
  ) {
    return "repair";
  }
  return "unknown";
}

export function extractFields(text: string): {
  systemType?: string;
  zip?: string;
  issue?: string;
} {
  const zip = text.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
  let systemType: string | undefined;
  if (/heat pump/i.test(text)) systemType = "heat pump";
  else if (/furnace/i.test(text)) systemType = "furnace";
  else if (/mini[\s-]?split/i.test(text)) systemType = "mini split";
  else if (/boiler/i.test(text)) systemType = "boiler";
  else if (/central\s*ac|air conditioner|\bac\b/i.test(text)) systemType = "central AC";
  const issue = text.trim().length <= 180 ? text.trim() : `${text.trim().slice(0, 177)}...`;
  return { systemType, zip, issue };
}

export function parseSlotChoice(text: string, slotCount: number): number | null {
  const trimmed = text.trim().toLowerCase();
  const numeric = trimmed.match(/^([1-9])\b/);
  if (numeric) {
    const n = Number(numeric[1]);
    if (n >= 1 && n <= slotCount) return n - 1;
  }
  if (slotCount >= 1 && /^(first|the first one)$/.test(trimmed)) return 0;
  if (slotCount >= 2 && /^(second|the second one)$/.test(trimmed)) return 1;
  if (slotCount >= 3 && /^(third|the third one)$/.test(trimmed)) return 2;
  return null;
}

export function looksLikeName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (/\d/.test(trimmed)) return false;
  if (classifyBlocked(trimmed)) return false;
  return /^[A-Za-z][A-Za-z .'-]+$/.test(trimmed);
}

function classifyBlocked(text: string): boolean {
  return /^(yes|no|stop|help|start|repair|maintenance|install)$/i.test(text.trim());
}
