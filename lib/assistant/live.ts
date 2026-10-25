function envOn(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/** Public demo deploys set this. It blocks real LLM calls even if a gateway injects a key. */
export function isDemoMode(): boolean {
  return envOn(process.env.DEMO_MODE) || envOn(process.env.PUBLIC_DEMO);
}

/** Explicit opt-in. A present OPENAI_API_KEY is not enough. */
export function llmLiveOptIn(): boolean {
  return (process.env.LLM_LIVE ?? "").trim().toLowerCase() === "true";
}

/**
 * Live model calls require LLM_LIVE=true and a key, and they are refused in demo mode.
 * Netlify AI Gateway can inject OPENAI_API_KEY without the operator setting it.
 */
export function assistantIsLive(): boolean {
  if (isDemoMode()) return false;
  if (!llmLiveOptIn()) return false;
  return Boolean(process.env.OPENAI_API_KEY);
}
