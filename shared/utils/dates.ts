import { addDays } from "./time";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const instant = Date.UTC(year, month - 1, day);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options })
      .format(instant)
      .replace(".", "");
  return {
    day,
    month: format({ month: "short" }),
    longMonth: capitalize(format({ month: "long" })),
    weekday: capitalize(format({ weekday: "short" })),
    longWeekday: format({ weekday: "long" }).split("-")[0]!,
  };
}

export const formatDay = (date: string) => {
  const { day, month } = dateParts(date);
  return `${day} ${month}`;
};

export const formatDayWithWeekday = (date: string) =>
  `${dateParts(date).weekday}, ${formatDay(date)}`;

export function formatDayRange(first: string, last: string) {
  if (dateParts(first).month === dateParts(last).month && first.slice(0, 4) === last.slice(0, 4)) {
    return `${dateParts(first).day} a ${formatDay(last)}`;
  }
  return `${formatDay(first)} a ${formatDay(last)}`;
}

// "Hoje, segunda 17 nov", "Amanhã, terça 18 nov", "Quarta, 19 nov".
export function formatAgendaDay(date: string, today: string) {
  const { longWeekday } = dateParts(date);
  const relative = {
    [addDays(today, -1)]: "Ontem",
    [today]: "Hoje",
    [addDays(today, 1)]: "Amanhã",
  }[date];
  if (relative) return `${relative}, ${longWeekday} ${formatDay(date)}`;
  return `${capitalize(longWeekday)}, ${formatDay(date)}`;
}
