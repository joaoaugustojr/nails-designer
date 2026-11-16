import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import type { BookingInput } from "../../shared/schemas/booking";
import { zonedToUtc } from "../../shared/utils/time";
import type { Database } from "../db/client";
import { bookings, clients } from "../db/schema";
import { findActiveService, freeStartMinutes } from "./availability";
import { upsertClient } from "./clients";

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
    try {
      await db.batch([
        upsertClient(db, { phone: input.phone, name: input.name }),
        db.insert(bookings).values({
          serviceId: service.id,
          clientId: sql`(select ${clients.id} from ${clients} where ${clients.phone} = ${input.phone})`,
          serviceName: service.name,
          serviceDurationMinutes: service.durationMinutes,
          servicePriceCents: service.priceCents,
          startsAt: new Date(zonedToUtc(input.date, input.startMinute, timezone)),
          endsAt: new Date(
            zonedToUtc(input.date, input.startMinute + service.durationMinutes, timezone),
          ),
          clientName: input.name,
          clientPhone: input.phone,
          clientEmail: input.email || null,
          remindersOptIn: input.remindersOptIn,
          token,
          idempotencyKey: input.idempotencyKey,
        }),
      ]);
    } catch (error) {
      if (errorText(error).includes("booking_overlap")) throw slotTaken();
      throw error;
    }
    return { token };
  });
}
