const STOP = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const HELP = new Set(["HELP", "INFO"]);
const START = new Set(["START", "UNSTOP"]);

export type SmsKeyword = "stop" | "help" | "start";

export function classifyKeyword(body: string): SmsKeyword | null {
  const normalized = body.trim().toUpperCase().replace(/[.!,]+$/g, "").replace(/\s+/g, "");
  if (STOP.has(normalized)) return "stop";
  if (HELP.has(normalized)) return "help";
  if (START.has(normalized)) return "start";
  return null;
}

export function isAffirmative(body: string): boolean {
  return /^(yes|yeah|yep|yup|sure|ok|okay|y)$/i.test(body.trim());
}

export function isNegative(body: string): boolean {
  return /^(no|nope|nah|n)$/i.test(body.trim());
}
