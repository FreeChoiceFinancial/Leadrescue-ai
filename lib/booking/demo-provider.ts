import { buildCandidateSlots } from "@/lib/booking/slots";
import type { AvailabilityProvider } from "@/lib/booking/types";

export function createDemoProvider(): AvailabilityProvider {
  return {
    id: "demo",
    mode: "sandbox",
    reason: "Demo calendar. These openings are fictional and nothing is written to Google Calendar.",
    async getSlots({ tenant, from }) {
      return buildCandidateSlots(from, tenant.timezone, 3);
    },
    async book({ slot }) {
      return {
        externalEventId: `sandbox_${slot.start}`,
        mode: "sandbox",
        provider: "demo",
      };
    },
  };
}
