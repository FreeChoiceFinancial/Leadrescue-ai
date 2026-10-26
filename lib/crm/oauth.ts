import { CRM_SANDBOX_LABEL, crmLiveEnabled } from "@/lib/crm/mode";
import { safeCrmError } from "@/lib/crm/redact";
import type { ZohoRegion } from "@/lib/crm/mapping";

export const HUBSPOT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
  "crm.objects.notes.write",
  "timeline",
] as const;

export const ZOHO_SCOPES = [
  "ZohoCRM.modules.contacts.ALL",
  "ZohoCRM.modules.deals.ALL",
  "ZohoCRM.modules.leads.ALL",
  "ZohoCRM.modules.notes.ALL",
].join(",");

export const ZOHO_ACCOUNTS: Record<ZohoRegion, string> = {
  com: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  "com.au": "https://accounts.zoho.com.au",
};

export const ZOHO_APIS: Record<ZohoRegion, string> = {
  com: "https://www.zohoapis.com",
  eu: "https://www.zohoapis.eu",
  in: "https://www.zohoapis.in",
  "com.au": "https://www.zohoapis.com.au",
};

export function isZohoRegion(value: string | null | undefined): value is ZohoRegion {
  return value === "com" || value === "eu" || value === "in" || value === "com.au";
}

export function hubspotAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://app.hubspot.com/oauth/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", HUBSPOT_SCOPES.join(" "));
  url.searchParams.set("state", input.state);
  return url.toString();
}

export function zohoAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string; region: ZohoRegion }): string {
  const url = new URL(`${ZOHO_ACCOUNTS[input.region]}/oauth/v2/auth`);
  url.searchParams.set("scope", ZOHO_SCOPES);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

async function readTokens(response: Response, fallbackRefresh?: string): Promise<OAuthTokens> {
  if (!response.ok) throw new Error(safeCrmError(response.status));
  const json = (await response.json()) as TokenResponse;
  const refreshToken = json.refresh_token ?? fallbackRefresh;
  if (!json.access_token || !refreshToken) throw new Error("CRM request failed (token).");
  return {
    accessToken: json.access_token,
    refreshToken,
    expiresIn: json.expires_in ?? 1800,
  };
}

export async function exchangeHubSpotCode(
  input: { code: string; redirectUri: string; clientId: string; clientSecret: string },
  fetchImpl: typeof fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const response = await fetchImpl("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return readTokens(response);
}

export async function refreshHubSpotToken(
  input: { refreshToken: string; clientId: string; clientSecret: string },
  fetchImpl: typeof fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const response = await fetchImpl("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return readTokens(response, input.refreshToken);
}

export async function revokeHubSpotToken(refreshToken: string, fetchImpl: typeof fetch): Promise<void> {
  const response = await fetchImpl(`https://api.hubapi.com/oauth/v1/refresh-tokens/${encodeURIComponent(refreshToken)}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) throw new Error(safeCrmError(response.status));
}

export async function exchangeZohoCode(
  input: { code: string; redirectUri: string; clientId: string; clientSecret: string; region: ZohoRegion },
  fetchImpl: typeof fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const response = await fetchImpl(`${ZOHO_ACCOUNTS[input.region]}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return readTokens(response);
}

export async function refreshZohoToken(
  input: { refreshToken: string; clientId: string; clientSecret: string; region: ZohoRegion },
  fetchImpl: typeof fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const response = await fetchImpl(`${ZOHO_ACCOUNTS[input.region]}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return readTokens(response, input.refreshToken);
}

export async function revokeZohoToken(refreshToken: string, region: ZohoRegion, fetchImpl: typeof fetch): Promise<void> {
  const url = new URL(`${ZOHO_ACCOUNTS[region]}/oauth/v2/token/revoke`);
  url.searchParams.set("token", refreshToken);
  const response = await fetchImpl(url, { method: "POST" });
  if (!response.ok && response.status !== 404) throw new Error(safeCrmError(response.status));
}

export function connectDecision(redirect: string | null): { mode: "sandbox" | "live"; label: string; redirect: string | null } {
  if (!crmLiveEnabled() || !redirect) {
    return { mode: "sandbox", label: CRM_SANDBOX_LABEL, redirect: null };
  }
  return { mode: "live", label: CRM_SANDBOX_LABEL, redirect };
}
