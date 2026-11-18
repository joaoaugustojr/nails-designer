import { and, desc, eq, exists, gte, lt, or } from "drizzle-orm";

import type { WaitlistInput } from "../../shared/schemas/waitlist";
import { isOpenWeekday, todayIn } from "../../shared/utils/time";
import { bookings, waitlistRequests } from "../db/schema";
import { findActiveService, isBookableDate } from "./availability";
import { notify, waitlistMessage } from "./notifications";
import { listOpenWeekdays } from "./schedule";

export async function createWaitlistRequest(input: WaitlistInput) {
  const settings = await readSettings();
  if (!settings.isWaitlistEnabled) {
    throw createError({ statusCode: 403, statusMessage: "Waitlist is off" });
  }

  const db = await useDb();
  const [service, openWeekdays] = await Promise.all([
    findActiveService(db, input.serviceId),
    listOpenWeekdays(),
  ]);
  const now = Date.now();
  const isAskable = (date: string) =>
    isBookableDate(date, settings.maxDaysAhead, settings.timezone, now) &&
    isOpenWeekday(date, openWeekdays);
  if (!input.dates.every(isAskable)) {
    throw createError({ statusCode: 400, statusMessage: "Dates the store does not open" });
  }

  const request = {
    serviceId: service.id,
    serviceName: service.name,
    clientName: input.name,
    clientPhone: input.phone,
    dates: input.dates,
    periods: input.periods,
    note: input.note,
    lastDate: input.dates.at(-1)!,
  };
  await db.insert(waitlistRequests).values(request);
  if (settings.whatsapp) void notify(waitlistMessage(settings.whatsapp, request));
}

export async function listWaitlist() {
  const db = await useDb();
  const today = todayIn(await storeTimezone());
  const isBooked = exists(
    db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          eq(bookings.clientPhone, waitlistRequests.clientPhone),
          eq(bookings.serviceId, waitlistRequests.serviceId),
          gte(bookings.createdAt, waitlistRequests.createdAt),
        ),
      ),
  );
  await db.delete(waitlistRequests).where(or(lt(waitlistRequests.lastDate, today), isBooked));
  return db.query.waitlistRequests.findMany({
    columns: { lastDate: false },
    orderBy: desc(waitlistRequests.createdAt),
  });
}

export async function deleteWaitlistRequest(id: number) {
  const db = await useDb();
  await db.delete(waitlistRequests).where(eq(waitlistRequests.id, id));
}
