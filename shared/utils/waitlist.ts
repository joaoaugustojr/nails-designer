import type { WaitlistPeriod } from "../schemas/waitlist";
import { dateParts, formatDay } from "./dates";

export const WAITLIST_PERIOD_LABELS: Record<WaitlistPeriod, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

export function formatWaitlistWish(dates: string[], periods: WaitlistPeriod[]) {
  const days = dates.map((date) => `${dateParts(date).weekday} ${formatDay(date)}`).join(", ");
  const times = periods.map((period) => WAITLIST_PERIOD_LABELS[period]).join(", ");
  return `${days} · ${times}`;
}
