import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, migrateDatabase } from "../db/client";
import { bookings, clients, services, workingHours } from "../db/schema";
import { createBooking } from "./bookings";

vi.stubGlobal("createError", (error: object) => Object.assign(new Error(), error));
const dir = mkdtempSync(join(tmpdir(), "nails-bookings-"));
const db = createDatabase(`file:${join(dir, "test.db")}`);
vi.stubGlobal("useDb", async () => db);
vi.stubGlobal("readSettings", async () => ({
  timezone: "America/Sao_Paulo",
  slotStepMinutes: 30,
  gapMinutes: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 30,
}));

const DAY = "2026-11-18";
let serviceId: number;

const request = (changes: Partial<Parameters<typeof createBooking>[0]> = {}) => ({
  serviceId,
  date: DAY,
  startMinute: 9 * 60,
  name: "Ana",
  phone: "11912345678",
  email: "",
  remindersOptIn: true,
  idempotencyKey: randomUUID(),
  website: "",
  ...changes,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T08:00:00-03:00"));
  await migrateDatabase(db);
  for (const table of [bookings, clients, workingHours, services]) await db.delete(table);
  const [service] = await db
    .insert(services)
    .values({ name: "Gel", priceCents: 6500, durationMinutes: 60 })
    .returning({ id: services.id });
  serviceId = service!.id;
  await db.insert(workingHours).values({ weekday: 3, startMinute: 9 * 60, endMinute: 12 * 60 });
});

afterEach(() => vi.useRealTimers());
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("createBooking", () => {
  it("saves the booking with a service snapshot and the client by phone", async () => {
    const { token } = await createBooking(request());
    const saved = await db.query.bookings.findFirst();
    expect(saved).toMatchObject({
      token,
      serviceName: "Gel",
      servicePriceCents: 6500,
      startsAt: new Date(`${DAY}T09:00:00-03:00`),
      endsAt: new Date(`${DAY}T10:00:00-03:00`),
      status: "confirmed",
    });
  });

  it("lets only one of two simultaneous requests take the same slot", async () => {
    const results = await Promise.allSettled([
      createBooking(request({ name: "Ana" })),
      createBooking(request({ name: "Bia", phone: "11987654321" })),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    const failure = results.find((result) => result.status === "rejected");
    expect(failure?.reason).toMatchObject({ statusCode: 409 });
    expect(await db.$count(bookings)).toBe(1);
  });

  it("returns the same booking when the same form is sent twice", async () => {
    const same = request();
    const [first, second] = await Promise.all([createBooking(same), createBooking(same)]);
    const third = await createBooking(same);
    expect(second.token).toBe(first.token);
    expect(third.token).toBe(first.token);
    expect(await db.$count(bookings)).toBe(1);
  });

  it("refuses a time that is not free or not offered", async () => {
    await createBooking(request());
    await expect(createBooking(request({ startMinute: 9 * 60 + 30 }))).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(createBooking(request({ startMinute: 9 * 60 + 10 }))).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(createBooking(request({ startMinute: 11 * 60 + 30 }))).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("keeps one client per phone with the latest name", async () => {
    await createBooking(request({ name: "Ana" }));
    await createBooking(request({ name: "Ana Paula", startMinute: 10 * 60 }));
    expect(await db.select({ name: clients.name }).from(clients)).toEqual([{ name: "Ana Paula" }]);
  });
});

describe("booking overlap guard", () => {
  it("rejects overlapping confirmed bookings in the database itself", async () => {
    await createBooking(request());
    const [existing] = await db.select().from(bookings);
    const { id: _id, ...copy } = existing!;
    const overlapping = {
      ...copy,
      token: "other",
      idempotencyKey: null,
      startsAt: new Date(`${DAY}T09:30:00-03:00`),
      endsAt: new Date(`${DAY}T10:30:00-03:00`),
    };
    await expect(db.insert(bookings).values(overlapping)).rejects.toThrow();
    await db.insert(bookings).values({ ...overlapping, status: "cancelled" });
    await expect(
      db.update(bookings).set({ status: "confirmed" }).where(eq(bookings.token, "other")),
    ).rejects.toThrow();
  });
});
