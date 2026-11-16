import { formatDuration } from "./duration";
import { addDays, MINUTES_PER_DAY, minutesToTime, utcToZoned } from "./time";

export function formatLeadTime(minutes: number) {
  if (minutes === 0) return "Sem mínimo";
  if (minutes % MINUTES_PER_DAY) return formatDuration(minutes);
  const days = minutes / MINUTES_PER_DAY;
  return days === 1 ? "1 dia" : `${days} dias`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const instant = Date.UTC(year, month - 1, day);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options })
      .format(instant)
      .replace(".", "");
  return {
    day,
    month: format({ month: "short" }),
    weekday: capitalize(format({ weekday: "short" })),
  };
}

const formatDay = (date: string) => {
  const { day, month } = dateParts(date);
  return `${day} ${month}`;
};

const formatDayWithWeekday = (date: string) => `${dateParts(date).weekday}, ${formatDay(date)}`;

function formatDayRange(first: string, last: string) {
  if (dateParts(first).month === dateParts(last).month && first.slice(0, 4) === last.slice(0, 4)) {
    return `${dateParts(first).day} a ${formatDay(last)}`;
  }
  return `${formatDay(first)} a ${formatDay(last)}`;
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
