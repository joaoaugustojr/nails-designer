import { and, eq, gt, isNull, lte } from "drizzle-orm";

import { utcToZoned, zonedToUtc } from "../../shared/utils/time";
import { bookings } from "../db/schema";
import { bookingMessage, notify } from "./notifications";
import { bookingPush, pushToPanel } from "./push";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const DAY_OF_REMINDER_MINUTE = 8 * 60;
const OWNER_REMINDER_MINUTES = 30;

type SentColumn =
  "reminderDayBeforeSentAt" | "reminderDaySentAt" | "reminder1hSentAt" | "reminder30mSentAt";

// In send order.
const REMINDERS: { column: SentColumn; dueAt: (startsAt: number, timezone: string) => number }[] = [
  { column: "reminderDayBeforeSentAt", dueAt: (startsAt) => startsAt - MS_PER_DAY },
  {
    column: "reminderDaySentAt",
    dueAt: (startsAt, timezone) =>
      zonedToUtc(utcToZoned(startsAt, timezone).date, DAY_OF_REMINDER_MINUTE, timezone),
  },
  { column: "reminder1hSentAt", dueAt: (startsAt) => startsAt - 60 * MS_PER_MINUTE },
  { column: "reminder30mSentAt", dueAt: (startsAt) => startsAt - 30 * MS_PER_MINUTE },
];

export async function sendDueReminders(now = Date.now()) {
  const db = await useDb();
  const settings = await readSettings();
  const upcoming = await db.query.bookings.findMany({
    where: and(
      eq(bookings.status, "confirmed"),
      eq(bookings.remindersOptIn, true),
      gt(bookings.startsAt, new Date(now)),
      lte(bookings.startsAt, new Date(now + MS_PER_DAY)),
    ),
  });

  let sentCount = 0;
  for (const booking of upcoming) {
    const startsAt = booking.startsAt.getTime();
    // A reminder due before the booking was made is skipped: the confirmation just covered it.
    const due = REMINDERS.filter(({ column, dueAt }) => {
      const at = dueAt(startsAt, settings.timezone);
      return booking[column] === null && at <= now && at >= booking.createdAt.getTime();
    });
    if (due.length === 0) continue;

    // Only the latest due reminder goes out; earlier ones still pending (app down, late booking)
    // are marked sent with it, so the client never gets a burst. Marking first means a crash
    // loses a reminder instead of sending it twice.
    const sentAt = new Date(now);
    await db
      .update(bookings)
      .set(Object.fromEntries(due.map(({ column }) => [column, sentAt])))
      .where(eq(bookings.id, booking.id));
    void notify(bookingMessage("booking_reminder", booking, settings));
    sentCount++;
  }
  return sentCount;
}

// The panel's "your client arrives in 30 minutes" push, for every confirmed booking (panel ones
// included, whatever the client's opt-in). Skipped when the booking was made inside the window.
export async function sendDueOwnerReminders(now = Date.now()) {
  const db = await useDb();
  const { timezone } = await readSettings();
  const windowMs = OWNER_REMINDER_MINUTES * MS_PER_MINUTE;
  const due = await db.query.bookings.findMany({
    where: and(
      eq(bookings.status, "confirmed"),
      isNull(bookings.ownerReminderSentAt),
      gt(bookings.startsAt, new Date(now)),
      lte(bookings.startsAt, new Date(now + windowMs)),
    ),
  });

  let sentCount = 0;
  for (const booking of due) {
    if (booking.createdAt.getTime() > booking.startsAt.getTime() - windowMs) continue;
    // Marking first means a crash loses a reminder instead of sending it twice.
    await db
      .update(bookings)
      .set({ ownerReminderSentAt: new Date(now) })
      .where(eq(bookings.id, booking.id));
    void pushToPanel(bookingPush("arriving", booking, timezone));
    sentCount++;
  }
  return sentCount;
}
