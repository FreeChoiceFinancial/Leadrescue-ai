export async function sendOwnerEmail(input: { to: string; subject: string; text: string }): Promise<{ mode: "live" | "sandbox" }> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { mode: "sandbox" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) throw new Error(`Email failed (${response.status}).`);
  return { mode: "live" };
}

export async function deliverEffects(effects: {
  sms: Array<{ to: string; from: string | null; body: string; delivery: string }>;
  ownerSms: Array<{ to: string; body: string }>;
  ownerEmails: Array<{ to: string; subject: string; text: string }>;
}, smsFrom: string | null): Promise<Array<{ channel: string; mode: "live" | "sandbox"; detail: string }>> {
  const { sendTwilioSms, twilioConfigured } = await import("@/lib/integrations/twilio");
  const notes: Array<{ channel: string; mode: "live" | "sandbox"; detail: string }> = [];
  for (const message of effects.sms) {
    if (message.delivery !== "sent") {
      notes.push({ channel: "sms", mode: "sandbox", detail: `${message.delivery} to ${message.to}` });
      continue;
    }
    if (!twilioConfigured() || !(message.from ?? smsFrom)) {
      notes.push({ channel: "sms", mode: "sandbox", detail: `not sent to ${message.to}` });
      continue;
    }
    await sendTwilioSms({ to: message.to, from: (message.from ?? smsFrom) as string, body: message.body });
    notes.push({ channel: "sms", mode: "live", detail: `sent to ${message.to}` });
  }
  for (const message of effects.ownerSms) {
    if (!twilioConfigured() || !smsFrom) {
      notes.push({ channel: "owner_sms", mode: "sandbox", detail: `queued notice to ${message.to}` });
      continue;
    }
    await sendTwilioSms({ to: message.to, from: smsFrom, body: message.body });
    notes.push({ channel: "owner_sms", mode: "live", detail: `sent to ${message.to}` });
  }
  for (const email of effects.ownerEmails) {
    const result = await sendOwnerEmail(email);
    notes.push({ channel: "email", mode: result.mode, detail: email.subject });
  }
  return notes;
}
