export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const bag = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    weekday: bag.weekday ?? "",
  };
}

/** Quiet window may wrap midnight. start=21 end=8 means 9:00pm through 7:59am. */
export function isQuietHours(
  at: Date,
  timeZone: string,
  startHour: number,
  endHour: number,
): boolean {
  const hour = zonedParts(at, timeZone).hour;
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = utcGuess;
  for (let i = 0; i < 3; i += 1) {
    const shown = zonedParts(new Date(instant), timeZone);
    const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, 0);
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = shownUtc - desired;
    if (diff === 0) break;
    instant -= diff;
  }
  return new Date(instant);
}

/** Next moment quiet hours end, in absolute time. If already open, returns `at`. */
export function nextOpenMoment(
  at: Date,
  timeZone: string,
  startHour: number,
  endHour: number,
): Date {
  if (!isQuietHours(at, timeZone, startHour, endHour)) return at;
  const parts = zonedParts(at, timeZone);
  let day = parts.day;
  let month = parts.month;
  let year = parts.year;
  const wraps = startHour > endHour;
  const afterEndSameDay = wraps && parts.hour >= startHour;
  if (afterEndSameDay || (!wraps && parts.hour >= endHour)) {
    const probe = zonedTimeToUtc(year, month, day, 12, 0, timeZone);
    const next = zonedParts(new Date(probe.getTime() + 24 * 60 * 60 * 1000), timeZone);
    year = next.year;
    month = next.month;
    day = next.day;
  }
  return zonedTimeToUtc(year, month, day, endHour, 0, timeZone);
}

export function addDaysZoned(at: Date, days: number, timeZone: string): ZonedParts {
  const parts = zonedParts(at, timeZone);
  const noon = zonedTimeToUtc(parts.year, parts.month, parts.day, 12, 0, timeZone);
  return zonedParts(new Date(noon.getTime() + days * 24 * 60 * 60 * 1000), timeZone);
}

export { zonedTimeToUtc };
