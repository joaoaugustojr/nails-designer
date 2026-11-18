import { randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";

import type { BookingInput, PanelBookingInput } from "../../shared/schemas/booking";
import { firstName } from "../../shared/utils/text";
import { utcToZoned, zonedToUtc } from "../../shared/utils/time";
import type { Database } from "../db/client";
import { bookings, clients, services } from "../db/schema";
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

type Settings = Awaited<ReturnType<typeof readSettings>>;

type NewBooking = {
  service: { id: number; name: string; durationMinutes: number };
  priceCents: number;
  date: string;
  startMinute: number;
  name: string;
  phone: string;
  remindersOptIn: boolean;
  idempotencyKey?: string;
};

function bookingTimes(
  booking: Pick<NewBooking, "service" | "date" | "startMinute">,
  timezone: string,
) {
  const { date, startMinute, service } = booking;
  return {
    startsAt: new Date(zonedToUtc(date, startMinute, timezone)),
    endsAt: new Date(zonedToUtc(date, startMinute + service.durationMinutes, timezone)),
  };
}

async function saveBooking(db: Database, booking: NewBooking, settings: Settings) {
  const { service } = booking;
  const { startsAt, endsAt } = bookingTimes(booking, settings.timezone);
  const token = randomBytes(24).toString("base64url");
  try {
    await db.batch([
      upsertClient(db, { phone: booking.phone, name: booking.name }),
      db.insert(bookings).values({
        serviceId: service.id,
        clientId: sql`(select ${clients.id} from ${clients} where ${clients.phone} = ${booking.phone})`,
        serviceName: service.name,
        serviceDurationMinutes: service.durationMinutes,
        servicePriceCents: booking.priceCents,
        startsAt,
        endsAt,
        clientName: booking.name,
        clientPhone: booking.phone,
        // The forms hide the opt-in while WhatsApp is off; saving it would send reminders
        // nobody was promised once it is turned on.
        remindersOptIn: booking.remindersOptIn && useRuntimeConfig().public.isWhatsappEnabled,
        token,
        idempotencyKey: booking.idempotencyKey,
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
        clientName: booking.name,
        clientPhone: booking.phone,
        serviceName: service.name,
        startsAt,
        endsAt,
        token,
      },
      settings,
    ),
  );
  return { token };
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

    return saveBooking(db, { ...input, service, priceCents: service.priceCents }, settings);
  });
}

// The owner may book outside working hours and over her own time off; another
// confirmed booking is the only conflict, and she cancels it first if she wants the slot.
export function createPanelBooking(input: PanelBookingInput) {
  return oneAtATime(async () => {
    const db = await useDb();
    const [service, settings] = await Promise.all([
      db.query.services.findFirst({
        where: eq(services.id, input.serviceId),
        columns: { id: true, name: true, durationMinutes: true },
      }),
      readSettings(),
    ]);
    if (!service) throw createError({ statusCode: 404, statusMessage: "Service not found" });

    const { startsAt, endsAt } = bookingTimes({ ...input, service }, settings.timezone);
    const conflict = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.status, "confirmed"),
        lt(bookings.startsAt, endsAt),
        gt(bookings.endsAt, startsAt),
      ),
      columns: { clientName: true, startsAt: true, endsAt: true },
    });
    if (conflict) {
      const zoned = (instant: Date) => utcToZoned(instant.getTime(), settings.timezone);
      throw createError({
        statusCode: 409,
        statusMessage: "Overlaps another booking",
        data: {
          clientName: conflict.clientName,
          date: zoned(conflict.startsAt).date,
          startMinute: zoned(conflict.startsAt).minutes,
          endMinute: zoned(conflict.endsAt).minutes,
        },
      });
    }

    return saveBooking(db, { ...input, service }, settings);
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
      serviceId: true,
      serviceName: true,
      serviceDurationMinutes: true,
      servicePriceCents: true,
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
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      serviceDurationMinutes: booking.serviceDurationMinutes,
      servicePriceCents: booking.servicePriceCents,
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
