import { buildCandidateSlots, subtractBusy } from "@/lib/booking/slots";
import { createDemoProvider } from "@/lib/booking/demo-provider";
import type { AvailabilityProvider, BookingResult } from "@/lib/booking/types";
import type { Slot, Tenant } from "@/lib/domain/types";

export type GoogleEnv = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
};

type FetchLike = typeof fetch;

export function googleCredentialsPresent(env: GoogleEnv = readGoogleEnv()): boolean {
  return Boolean(env.clientId && env.clientSecret && env.refreshToken);
}

export function readGoogleEnv(): GoogleEnv {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  };
}

export function createAvailabilityProvider(
  tenant: Pick<Tenant, "bookingProvider">,
  env: GoogleEnv = readGoogleEnv(),
  fetchImpl: FetchLike = fetch,
): AvailabilityProvider {
  if (tenant.bookingProvider !== "google") return createDemoProvider();
  if (!googleCredentialsPresent(env)) {
    const demo = createDemoProvider();
    return {
      ...demo,
      id: "google",
      mode: "sandbox",
      reason:
        "Google Calendar credentials are absent. Showing sandbox openings instead of live free/busy.",
      async book(input): Promise<BookingResult> {
        const booked = await demo.book(input);
        return { ...booked, provider: "google", mode: "sandbox" };
      },
    };
  }
  return createLiveGoogleProvider(env, fetchImpl);
}

function createLiveGoogleProvider(env: GoogleEnv, fetchImpl: FetchLike): AvailabilityProvider {
  return {
    id: "google",
    mode: "live",
    reason: null,
    async getSlots({ tenant, from }) {
      const calendarId = tenant.googleCalendarId;
      if (!calendarId) {
        throw new Error("Google Calendar is selected but no calendar id is saved for this business.");
      }
      const token = await refreshAccessToken(env, fetchImpl);
      const candidates = buildCandidateSlots(from, tenant.timezone, 8);
      const timeMin = candidates[0]?.start ?? from.toISOString();
      const timeMax = candidates[candidates.length - 1]?.end ?? new Date(from.getTime() + 86400000 * 7).toISOString();
      const response = await fetchImpl("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: calendarId }],
        }),
      });
      if (!response.ok) {
        throw new Error(`Google free/busy failed (${response.status}).`);
      }
      const payload = (await response.json()) as {
        calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
      };
      const busy = payload.calendars?.[calendarId]?.busy ?? [];
      return subtractBusy(candidates, busy).slice(0, 3);
    },
    async book({ tenant, slot, summary }) {
      const calendarId = tenant.googleCalendarId;
      if (!calendarId) {
        throw new Error("Google Calendar is selected but no calendar id is saved for this business.");
      }
      const token = await refreshAccessToken(env, fetchImpl);
      const response = await fetchImpl(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary,
            start: { dateTime: slot.start, timeZone: tenant.timezone },
            end: { dateTime: slot.end, timeZone: tenant.timezone },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Google event insert failed (${response.status}).`);
      }
      const payload = (await response.json()) as { id?: string };
      return {
        externalEventId: payload.id ?? null,
        mode: "live",
        provider: "google",
      };
    },
  };
}

async function refreshAccessToken(env: GoogleEnv, fetchImpl: FetchLike): Promise<string> {
  const body = new URLSearchParams({
    client_id: env.clientId ?? "",
    client_secret: env.clientSecret ?? "",
    refresh_token: env.refreshToken ?? "",
    grant_type: "refresh_token",
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status}).`);
  }
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("Google token refresh returned no access token.");
  return payload.access_token;
}

export function slotByIndex(slots: Slot[], index: number): Slot | null {
  return slots[index] ?? null;
}
