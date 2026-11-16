export const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;

export function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function zonedParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)!.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function offsetMs(instant: number, timeZone: string) {
  const zoned = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// A wall-clock time in the store's timezone ("2026-12-24", 540) to a UTC instant.
// The second pass corrects the offset across a daylight-saving change.
export function zonedToUtc(date: string, minutes: number, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const wallClock = Date.UTC(year, month - 1, day) + minutes * MS_PER_MINUTE;
  const firstGuess = wallClock - offsetMs(wallClock, timeZone);
  return wallClock - offsetMs(firstGuess, timeZone);
}

export function utcToZoned(instant: number, timeZone: string) {
  const zoned = zonedParts(instant, timeZone);
  const date = `${zoned.year}-${String(zoned.month).padStart(2, "0")}-${String(zoned.day).padStart(2, "0")}`;
  return { date, minutes: zoned.hour * 60 + zoned.minute };
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
