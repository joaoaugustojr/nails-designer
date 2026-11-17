import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import type { BookingInput } from "../../shared/schemas/booking";
import { firstName } from "../../shared/utils/text";
import { utcToZoned, zonedToUtc } from "../../shared/utils/time";
import type { Database } from "../db/client";
import { bookings, clients } from "../db/schema";
import { findActiveService, freeStartMinutes } from "./availability";
import { upsertClient } from "./clients";
import { bookingMessage, notify } from "./notifications";

const MS_PER_MINUTE = 60_000;

const slotTaken = () => createError({ statusCode: 409, statusMessage: "Slot no longer available" });

const errorText = (error: unknown): string =>
  error instanceof Error ? `${error.message} ${errorText(error.cause)}` : "";

// SQLite runs inside this process and blocks the thread while it waits for a lock, so two
// open transactions would freeze each other. Bookings are serialized here instead, and the
// write is one batch, which begins and commits without yielding.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function findByIdempotencyKey(db: Database, key: string) {
  return db.query.bookings.findFirst({
    where: eq(bookings.idempotencyKey, key),
    columns: { token: true },
  });
}

export function createBooking(input: BookingInput) {
  return oneAtATime(async () => {
    const db = await useDb();
    const previous = await findByIdempotencyKey(db, input.idempotencyKey);
    if (previous) return previous;

    const [service, settings] = await Promise.all([
      findActiveService(db, input.serviceId),
      readSettings(),
    ]);
    const [day] = await freeStartMinutes(db, {
      dates: [input.date],
      durationMinutes: service.durationMinutes,
      settings,
      now: Date.now(),
    });
    if (!day!.startMinutes.includes(input.startMinute)) throw slotTaken();

    const { timezone } = settings;
    const token = randomBytes(24).toString("base64url");
    const startsAt = new Date(zonedToUtc(input.date, input.startMinute, timezone));
    const endsAt = new Date(
      zonedToUtc(input.date, input.startMinute + service.durationMinutes, timezone),
    );
    try {
      await db.batch([
        upsertClient(db, { phone: input.phone, name: input.name }),
        db.insert(bookings).values({
          serviceId: service.id,
          clientId: sql`(select ${clients.id} from ${clients} where ${clients.phone} = ${input.phone})`,
          serviceName: service.name,
          serviceDurationMinutes: service.durationMinutes,
          servicePriceCents: service.priceCents,
          startsAt,
          endsAt,
          clientName: input.name,
          clientPhone: input.phone,
          remindersOptIn: input.remindersOptIn,
          token,
          idempotencyKey: input.idempotencyKey,
        }),
      ]);
    } catch (error) {
      if (errorText(error).includes("booking_overlap")) throw slotTaken();
      throw error;
    }
    void notify(
      bookingMessage(
        "booking_confirmation",
        {
          clientName: input.name,
          clientPhone: input.phone,
          serviceName: service.name,
          startsAt,
          endsAt,
          token,
        },
        settings,
      ),
    );
    return { token };
  });
}

const TOKEN_PATTERN = /^[\w-]{32}$/;

const bookingNotFound = () => createError({ statusCode: 404, statusMessage: "Booking not found" });

export async function findBookingByToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw bookingNotFound();
  const db = await useDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, token),
    columns: {
      token: true,
      status: true,
      clientName: true,
      serviceName: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!booking) throw bookingNotFound();
  return booking;
}

type CancelRules = { clientCanCancel: boolean; cancelDeadlineMinutes: number };

function canClientCancel(
  booking: { status: string; startsAt: Date },
  rules: CancelRules,
  now: number,
) {
  const deadline = booking.startsAt.getTime() - rules.cancelDeadlineMinutes * MS_PER_MINUTE;
  return rules.clientCanCancel && booking.status === "confirmed" && now <= deadline;
}

export async function getBookingSummary(token: string) {
  const [booking, store, settings] = await Promise.all([
    findBookingByToken(token),
    getStoreProfile(),
    readSettings(),
  ]);
  const now = Date.now();
  const start = utcToZoned(booking.startsAt.getTime(), store.timezone);
  const end = utcToZoned(booking.endsAt.getTime(), store.timezone);
  return {
    booking: {
      token: booking.token,
      status: booking.status,
      hasStarted: now >= booking.startsAt.getTime(),
      clientFirstName: firstName(booking.clientName),
      serviceName: booking.serviceName,
      date: start.date,
      startMinute: start.minutes,
      endMinute: end.minutes,
    },
    cancellation: {
      isOffered: settings.clientCanCancel,
      deadlineMinutes: settings.cancelDeadlineMinutes,
      canCancelNow: canClientCancel(booking, settings, now),
    },
    store,
  };
}

export async function cancelBookingByClient(token: string) {
  const [booking, settings] = await Promise.all([findBookingByToken(token), readSettings()]);
  if (booking.status === "cancelled") return;
  if (!canClientCancel(booking, settings, Date.now())) {
    throw createError({ statusCode: 403, statusMessage: "Cancellation not allowed" });
  }
  const db = await useDb();
  await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(bookings.token, token), eq(bookings.status, "confirmed")));
}
