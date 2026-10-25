import { createHmac, timingSafeEqual } from "node:crypto";

export function twilioConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export function twilioSignature(url: string, params: Record<string, string>, authToken: string): string {
  const serialized = Object.keys(params)
    .sort()
    .reduce((data, key) => data + key + params[key], url);
  return createHmac("sha1", authToken).update(serialized, "utf8").digest("base64");
}

export function validTwilioSignature(
  url: string,
  params: Record<string, string>,
  authToken: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const expected = twilioSignature(url, params, authToken);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function sendTwilioSms(input: { to: string; from: string; body: string }): Promise<{ mode: "live" | "sandbox"; sid: string | null }> {
  if (!twilioConfigured() || !input.from) {
    return { mode: "sandbox", sid: null };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const token = process.env.TWILIO_AUTH_TOKEN as string;
  const body = new URLSearchParams({ To: input.to, From: input.from, Body: input.body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Twilio SMS failed (${response.status}).`);
  }
  const payload = (await response.json()) as { sid?: string };
  return { mode: "live", sid: payload.sid ?? null };
}
