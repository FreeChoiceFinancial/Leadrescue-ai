import type { Slot, Tenant } from "@/lib/domain/types";

export type BookingResult = {
  externalEventId: string | null;
  mode: "live" | "sandbox";
  provider: "demo" | "google";
};

export type AvailabilityProvider = {
  id: "demo" | "google";
  mode: "live" | "sandbox";
  reason: string | null;
  getSlots(input: { tenant: Tenant; from: Date }): Promise<Slot[]>;
  book(input: { tenant: Tenant; slot: Slot; summary: string }): Promise<BookingResult>;
};
