import { formatDay, formatDayRange, formatDayWithWeekday } from "./dates";
import { formatDuration } from "./duration";
import { plural } from "./text";
import { addDays, MINUTES_PER_DAY, minutesToTime, utcToZoned } from "./time";

export function formatLeadTime(minutes: number) {
  if (minutes === 0) return "Sem mínimo";
  if (minutes % MINUTES_PER_DAY) return formatDuration(minutes);
  return plural(minutes / MINUTES_PER_DAY, "dia", "dias");
}

// "Qui, 20 nov · 14:00 às 16:00", "24 a 26 dez · dia inteiro".
export function describeTimeOff(startsAt: number, endsAt: number, timeZone: string) {
  const start = utcToZoned(startsAt, timeZone);
  const end = utcToZoned(endsAt, timeZone);
  const isWholeDays = start.minutes === 0 && end.minutes === 0;

  if (isWholeDays) {
    const lastDay = addDays(end.date, -1);
    if (lastDay === start.date) return `${formatDayWithWeekday(start.date)} · dia inteiro`;
    return `${formatDayRange(start.date, lastDay)} · dias inteiros`;
  }

  const startTime = minutesToTime(start.minutes);
  const endTime = minutesToTime(end.minutes);
  if (start.date === end.date) {
    return `${formatDayWithWeekday(start.date)} · ${startTime} às ${endTime}`;
  }
  return `${formatDay(start.date)} ${startTime} a ${formatDay(end.date)} ${endTime}`;
}
