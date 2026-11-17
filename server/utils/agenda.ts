import { and, eq, gt, lt } from "drizzle-orm";

import { bookings, timeOff, workingHours } from "../db/schema";
import { bookingMessage, notify } from "./notifications";

const toDayMinutes = (instant: Date, day: string, timezone: string) => {
  const zoned = utcToZoned(instant.getTime(), timezone);
  if (zoned.date < day) return 0;
  if (zoned.date > day) return MINUTES_PER_DAY;
  return zoned.minutes;
};

export async function getAgenda(requestedDate: string | undefined) {
  const timezone = await storeTimezone();
  const date = requestedDate ?? todayIn(timezone);
  const dayStart = new Date(zonedToUtc(date, 0, timezone));
  const dayEnd = new Date(zonedToUtc(addDays(date, 1), 0, timezone));
  const weekday = weekdayOf(date);
  const db = await useDb();

  const [ranges, dayBookings, blocks] = await Promise.all([
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
  ]);

  const inDay = <T extends { startsAt: Date; endsAt: Date }>({ startsAt, endsAt, ...rest }: T) => ({
    ...rest,
    startMinute: toDayMinutes(startsAt, date, timezone),
    endMinute: toDayMinutes(endsAt, date, timezone),
  });

  return {
    date,
    today: todayIn(timezone),
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
