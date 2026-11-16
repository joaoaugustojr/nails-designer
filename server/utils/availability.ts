import type { DaySpan } from "../../shared/utils/day-timeline";
import { addDays, utcToZoned, zonedToUtc } from "../../shared/utils/time";

const MS_PER_MINUTE = 60_000;

type Interval = { startsAt: number; endsAt: number };

export type AvailabilityInput = {
  date: string;
  durationMinutes: number;
  workingRanges: DaySpan[];
  bookings: Interval[];
  timeOff: Interval[];
  rules: {
    slotStepMinutes: number;
    gapMinutes: number;
    minNoticeMinutes: number;
    maxDaysAhead: number;
  };
  timezone: string;
  now: number;
};

const overlaps = (first: Interval, second: Interval) =>
  first.startsAt < second.endsAt && second.startsAt < first.endsAt;

export function isBookableDate(date: string, maxDaysAhead: number, timezone: string, now: number) {
  const today = utcToZoned(now, timezone).date;
  return date >= today && date <= addDays(today, maxDaysAhead);
}

// Start minutes (in the store's timezone) where the whole service fits. The gap keeps
// free time on both sides of every booking; time off needs none.
export function availableStartMinutes(input: AvailabilityInput): number[] {
  const { date, durationMinutes, rules, timezone, now } = input;
  if (!isBookableDate(date, rules.maxDaysAhead, timezone, now)) return [];

  const gap = rules.gapMinutes * MS_PER_MINUTE;
  const busy = [
    ...input.bookings.map((booking) => ({
      startsAt: booking.startsAt - gap,
      endsAt: booking.endsAt + gap,
    })),
    ...input.timeOff,
  ];
  const earliestStart = now + rules.minNoticeMinutes * MS_PER_MINUTE;

  return input.workingRanges
    .flatMap((range) => {
      const starts: number[] = [];
      for (
        let start = range.startMinute;
        start + durationMinutes <= range.endMinute;
        start += rules.slotStepMinutes
      ) {
        starts.push(start);
      }
      return starts;
    })
    .filter((start) => {
      const slot = {
        startsAt: zonedToUtc(date, start, timezone),
        endsAt: zonedToUtc(date, start + durationMinutes, timezone),
      };
      return slot.startsAt >= earliestStart && !busy.some((event) => overlaps(event, slot));
    })
    .sort((first, second) => first - second);
}
