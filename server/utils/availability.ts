import { and, eq, gt, lt } from "drizzle-orm";

import type { AvailabilityQuery } from "../../shared/schemas/booking";
import type { DaySpan } from "../../shared/utils/day-timeline";
import { addDays, todayIn, weekdayOf, zonedToUtc } from "../../shared/utils/time";
import { bookings, servicePhotos, services, timeOff } from "../db/schema";

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
  const today = todayIn(timezone, now);
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

const toInterval = (event: { startsAt: Date; endsAt: Date }) => ({
  startsAt: event.startsAt.getTime(),
  endsAt: event.endsAt.getTime(),
});

export async function findServiceAvailability(serviceId: number, query: AvailabilityQuery) {
  const db = await useDb();
  const service = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.active, true)),
    columns: { id: true, name: true, durationMinutes: true, priceCents: true },
    with: {
      photos: {
        columns: { path: true },
        orderBy: [servicePhotos.sortOrder, servicePhotos.id],
        limit: 1,
      },
    },
  });
  if (!service) throw createError({ statusCode: 404, statusMessage: "Service not found" });

  const settings = await readSettings();
  const { timezone } = settings;
  const now = Date.now();
  const firstDate = todayIn(timezone, now);
  const lastDate = addDays(firstDate, settings.maxDaysAhead);
  const from = query.from && query.from > firstDate ? query.from : firstDate;
  const dates = Array.from({ length: query.days }, (_, index) => addDays(from, index)).filter(
    (date) => date <= lastDate,
  );

  const gap = settings.gapMinutes * MS_PER_MINUTE;
  const windowStart = new Date(zonedToUtc(from, 0, timezone) - gap);
  const windowEnd = new Date(zonedToUtc(addDays(from, query.days), 0, timezone) + gap);
  const [hours, busyBookings, blocks] = await Promise.all([
    db.query.workingHours.findMany({
      columns: { weekday: true, startMinute: true, endMinute: true },
    }),
    db.query.bookings.findMany({
      columns: { startsAt: true, endsAt: true },
      where: and(
        eq(bookings.status, "confirmed"),
        lt(bookings.startsAt, windowEnd),
        gt(bookings.endsAt, windowStart),
      ),
    }),
    db.query.timeOff.findMany({
      columns: { startsAt: true, endsAt: true },
      where: and(lt(timeOff.startsAt, windowEnd), gt(timeOff.endsAt, windowStart)),
    }),
  ]);

  return {
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      photoPath: service.photos[0]?.path ?? null,
    },
    firstDate,
    lastDate,
    days: dates.map((date) => ({
      date,
      startMinutes: availableStartMinutes({
        date,
        durationMinutes: service.durationMinutes,
        workingRanges: hours.filter((range) => range.weekday === weekdayOf(date)),
        bookings: busyBookings.map(toInterval),
        timeOff: blocks.map(toInterval),
        rules: settings,
        timezone,
        now,
      }),
    })),
  };
}
