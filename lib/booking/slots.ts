import { zonedParts, zonedTimeToUtc } from "@/lib/compliance/quiet-hours";
import type { Slot } from "@/lib/domain/types";

const WINDOWS = [
  { start: 9, end: 11 },
  { start: 13, end: 15 },
];

function formatLabel(start: Date, end: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day}, ${time.format(start)}–${time.format(end)}`;
}

/** Deterministic weekday windows used by the demo provider and as Google candidates. */
export function buildCandidateSlots(from: Date, timeZone: string, count = 3): Slot[] {
  const slots: Slot[] = [];
  const origin = zonedParts(from, timeZone);
  for (let dayOffset = 0; dayOffset < 14 && slots.length < count; dayOffset += 1) {
    const noon = zonedTimeToUtc(origin.year, origin.month, origin.day, 12, 0, timeZone);
    const parts = zonedParts(new Date(noon.getTime() + dayOffset * 24 * 60 * 60 * 1000), timeZone);
    if (parts.weekday === "Sat" || parts.weekday === "Sun") continue;
    for (const window of WINDOWS) {
      if (slots.length >= count) break;
      const start = zonedTimeToUtc(parts.year, parts.month, parts.day, window.start, 0, timeZone);
      const end = zonedTimeToUtc(parts.year, parts.month, parts.day, window.end, 0, timeZone);
      if (start.getTime() < from.getTime() + 60 * 60 * 1000) continue;
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: formatLabel(start, end, timeZone),
      });
    }
  }
  return slots;
}

export function subtractBusy(candidates: Slot[], busy: Array<{ start: string; end: string }>): Slot[] {
  return candidates.filter((slot) => {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    return !busy.some((block) => {
      const busyStart = new Date(block.start).getTime();
      const busyEnd = new Date(block.end).getTime();
      return start < busyEnd && end > busyStart;
    });
  });
}
