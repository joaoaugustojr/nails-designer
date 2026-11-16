import { asc, eq, gt } from "drizzle-orm";

import type { RulesChanges, TimeOffInput, TimeRange } from "#shared/schemas/schedule";

import { settings, timeOff, workingHours } from "../db/schema";

export async function storeTimezone() {
  const db = await useDb();
  const row = await db.query.settings.findFirst({ columns: { timezone: true } });
  return row!.timezone;
}

export async function getSchedule() {
  const db = await useDb();
  const [hours, rules] = await Promise.all([
    db.query.workingHours.findMany({
      columns: { weekday: true, startMinute: true, endMinute: true },
      orderBy: [asc(workingHours.weekday), asc(workingHours.startMinute)],
    }),
    db.query.settings.findFirst({
      columns: {
        timezone: true,
        gapMinutes: true,
        minNoticeMinutes: true,
        maxDaysAhead: true,
        clientCanCancel: true,
        cancelDeadlineMinutes: true,
      },
    }),
  ]);
  return { workingHours: hours, rules: rules! };
}

export async function replaceDayRanges(weekday: number, ranges: TimeRange[]) {
  const db = await useDb();
  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.weekday, weekday));
    if (ranges.length) {
      await tx.insert(workingHours).values(ranges.map((range) => ({ weekday, ...range })));
    }
  });
}

export async function updateRules(changes: RulesChanges) {
  const db = await useDb();
  await db.update(settings).set(changes).where(eq(settings.id, 1));
}

export async function listUpcomingTimeOff() {
  const db = await useDb();
  return db.query.timeOff.findMany({
    where: gt(timeOff.endsAt, new Date()),
    orderBy: [asc(timeOff.startsAt)],
  });
}

export async function createTimeOff(input: TimeOffInput) {
  const timezone = await storeTimezone();
  const isWholeDays = input.startMinute === null;
  const startsAt = zonedToUtc(input.startDate, input.startMinute ?? 0, timezone);
  // Whole days end at midnight after the last day.
  const endsAt = isWholeDays
    ? zonedToUtc(addDays(input.endDate, 1), 0, timezone)
    : zonedToUtc(input.endDate, input.endMinute!, timezone);

  if (startsAt >= endsAt) {
    throw createError({ statusCode: 400, statusMessage: "Time off ends before it starts" });
  }

  const db = await useDb();
  const [created] = await db
    .insert(timeOff)
    .values({
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      reason: input.reason || null,
    })
    .returning({ id: timeOff.id });
  return created!;
}

export async function deleteTimeOff(id: number) {
  const db = await useDb();
  const [deleted] = await db
    .delete(timeOff)
    .where(eq(timeOff.id, id))
    .returning({ id: timeOff.id });
  if (!deleted) throw createError({ statusCode: 404, statusMessage: "Time off not found" });
}
