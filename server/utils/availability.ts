import { and, eq, gt, lt } from "drizzle-orm";

import type { AvailabilityQuery } from "../../shared/schemas/booking";
import type { DaySpan } from "../../shared/utils/day-timeline";
import { addDays, todayIn, weekdayOf, zonedToUtc } from "../../shared/utils/time";
import type { Database } from "../db/client";
import { bookings, servicePhotos, services, timeOff } from "../db/schema";
import { listOpenWeekdays } from "./schedule";

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

export function bookableRange(maxDaysAhead: number, timezone: string, now: number) {
  const firstDate = todayIn(timezone, now);
  return { firstDate, lastDate: addDays(firstDate, maxDaysAhead) };
}

export function isBookableDate(date: string, maxDaysAhead: number, timezone: string, now: number) {
  const { firstDate, lastDate } = bookableRange(maxDaysAhead, timezone, now);
  return date >= firstDate && date <= lastDate;
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

type Reader = Pick<Database, "query">;
type Settings = Awaited<ReturnType<typeof readSettings>>;

export async function findActiveService(db: Reader, serviceId: number) {
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
  return service;
}

export async function freeStartMinutes(
  db: Reader,
  {
    dates,
    durationMinutes,
    settings,
    now,
  }: {
    dates: string[];
    durationMinutes: number;
    settings: Settings;
    now: number;
  },
) {
  const { timezone } = settings;
  const gap = settings.gapMinutes * MS_PER_MINUTE;
  const windowStart = new Date(zonedToUtc(dates[0]!, 0, timezone) - gap);
  const windowEnd = new Date(zonedToUtc(addDays(dates.at(-1)!, 1), 0, timezone) + gap);
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

  return dates.map((date) => ({
    date,
    startMinutes: availableStartMinutes({
      date,
      durationMinutes,
      workingRanges: hours.filter((range) => range.weekday === weekdayOf(date)),
      bookings: busyBookings.map(toInterval),
      timeOff: blocks.map(toInterval),
      rules: settings,
      timezone,
      now,
    }),
  }));
}

export async function findServiceAvailability(serviceId: number, query: AvailabilityQuery) {
  const db = await useDb();
  const [service, settings] = await Promise.all([findActiveService(db, serviceId), readSettings()]);
  const now = Date.now();
  const { firstDate, lastDate } = bookableRange(settings.maxDaysAhead, settings.timezone, now);
  const from = query.from && query.from > firstDate ? query.from : firstDate;
  const to = addDays(from, query.days - 1);
  const bookableDates = Array.from({ length: settings.maxDaysAhead + 1 }, (_, index) =>
    addDays(firstDate, index),
  );
  // The whole bookable range is computed so the calendar can disable full and closed days.
  const [allDays, openWeekdays] = await Promise.all([
    freeStartMinutes(db, {
      dates: bookableDates,
      durationMinutes: service.durationMinutes,
      settings,
      now,
    }),
    listOpenWeekdays(),
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
    openWeekdays,
    openDates: allDays.filter((day) => day.startMinutes.length).map((day) => day.date),
    days: allDays.filter((day) => day.date >= from && day.date <= to),
  };
}
