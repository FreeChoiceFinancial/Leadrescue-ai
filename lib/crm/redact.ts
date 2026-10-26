/** Fixed log lines. Callers must not append phones, emails, message bodies, or tokens. */
export function safeCrmDetail(status: "sandbox" | "succeeded" | "retry" | "failed" | "disconnected"): string {
  if (status === "sandbox") return "Not sent.";
  if (status === "succeeded") return "Accepted.";
  if (status === "retry") return "Will retry.";
  if (status === "disconnected") return "Tokens cleared.";
  return "Stopped.";
}

export function safeCrmError(status: number): string {
  return `CRM request failed (${status}).`;
}

export function redactCrmText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/\+\d{8,15}/g, "[redacted]")
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[redacted]")
    .replace(/refresh_token=[^&\s]+/gi, "refresh_token=[redacted]")
    .replace(/access_token=[^&\s]+/gi, "access_token=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/g, "Bearer [redacted]");
}
