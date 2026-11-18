import { and, eq, gt, gte, lt } from "drizzle-orm";

import { bookings, timeOff, workingHours } from "../db/schema";
import { bookingMessage, notify } from "./notifications";

const toDayMinutes = (instant: Date, day: string, timezone: string) => {
  const zoned = utcToZoned(instant.getTime(), timezone);
  if (zoned.date < day) return 0;
  if (zoned.date > day) return MINUTES_PER_DAY;
  return zoned.minutes;
};

export async function getAgenda(requestedDate: string | undefined) {
  const { timezone, maxDaysAhead } = await readSettings();
  const today = todayIn(timezone);
  const date = requestedDate ?? today;
  const dayStart = new Date(zonedToUtc(date, 0, timezone));
  const dayEnd = new Date(zonedToUtc(addDays(date, 1), 0, timezone));
  const weekday = weekdayOf(date);
  const db = await useDb();

  const todayStart = new Date(zonedToUtc(today, 0, timezone));
  const [ranges, dayBookings, blocks, openWeekdays, upcoming] = await Promise.all([
    db.query.workingHours.findMany({
      columns: { startMinute: true, endMinute: true },
      where: eq(workingHours.weekday, weekday),
    }),
    db.query.bookings.findMany({
      columns: {
        id: true,
        startsAt: true,
        endsAt: true,
        clientName: true,
        clientPhone: true,
        serviceName: true,
        servicePriceCents: true,
      },
      where: and(
        eq(bookings.status, "confirmed"),
        lt(bookings.startsAt, dayEnd),
        gt(bookings.endsAt, dayStart),
      ),
    }),
    db.query.timeOff.findMany({
      columns: { id: true, startsAt: true, endsAt: true, reason: true },
      where: and(lt(timeOff.startsAt, dayEnd), gt(timeOff.endsAt, dayStart)),
    }),
    listOpenWeekdays(),
    db.query.bookings.findMany({
      columns: { startsAt: true },
      where: and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, todayStart)),
    }),
  ]);
  const bookedDates = [
    ...new Set(upcoming.map(({ startsAt }) => utcToZoned(startsAt.getTime(), timezone).date)),
  ].sort();

  const inDay = <T extends { startsAt: Date; endsAt: Date }>({ startsAt, endsAt, ...rest }: T) => ({
    ...rest,
    startMinute: toDayMinutes(startsAt, date, timezone),
    endMinute: toDayMinutes(endsAt, date, timezone),
  });

  return {
    date,
    today,
    // The calendar offers only days clients can book: open weekdays up to the last bookable date.
    lastOpenDate: bookableRange(maxDaysAhead, timezone, Date.now()).lastDate,
    openWeekdays,
    // Bookings the owner made on closed days or past the open agenda must stay reachable.
    bookedDates,
    workingRanges: ranges.sort((first, second) => first.startMinute - second.startMinute),
    bookingCount: dayBookings.length,
    items: buildDayTimeline(ranges, dayBookings.map(inDay), blocks.map(inDay)),
  };
}

export async function cancelBooking(id: number, { notifyClient }: { notifyClient: boolean }) {
  const db = await useDb();
  const [cancelled] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(bookings.id, id), eq(bookings.status, "confirmed")))
    .returning({
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      serviceName: bookings.serviceName,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      token: bookings.token,
    });
  if (!cancelled) throw createError({ statusCode: 404, statusMessage: "Booking not found" });
  if (notifyClient)
    void notify(bookingMessage("booking_cancelled", cancelled, await readSettings()));
}
