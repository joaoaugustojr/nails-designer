import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, migrateDatabase } from "../db/client";
import { bookings, clients, services, workingHours } from "../db/schema";
import { cancelBooking } from "./agenda";
import { cancelBookingByClient, createBooking } from "./bookings";

vi.stubGlobal("createError", (error: object) => Object.assign(new Error(), error));
const dir = mkdtempSync(join(tmpdir(), "nails-bookings-"));
const db = createDatabase(`file:${join(dir, "test.db")}`);
vi.stubGlobal("useDb", async () => db);
vi.stubGlobal("useRuntimeConfig", () => ({ siteUrl: "https://example.com" }));
const settings = {
  storeName: "Studio",
  timezone: "America/Sao_Paulo",
  slotStepMinutes: 30,
  gapMinutes: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 30,
  clientCanCancel: true,
  cancelDeadlineMinutes: 120,
};
vi.stubGlobal("readSettings", async () => settings);

const DAY = "2026-11-18";
let serviceId: number;

const request = (changes: Partial<Parameters<typeof createBooking>[0]> = {}) => ({
  serviceId,
  date: DAY,
  startMinute: 9 * 60,
  name: "Ana",
  phone: "11912345678",
  remindersOptIn: true,
  idempotencyKey: randomUUID(),
  website: "",
  ...changes,
});

beforeEach(async () => {
  Object.assign(settings, { clientCanCancel: true, cancelDeadlineMinutes: 120 });
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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
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

  it("sends the confirmation once, not again on a repeated submit", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const same = request({ name: "Ana Souza" });
    const { token } = await createBooking(same);
    await createBooking(same);
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("Notification booking_confirmation to 11912345678", {
      clientFirstName: "Ana",
      storeName: "Studio",
      serviceName: "Gel",
      when: "Quarta, 18 de novembro · 09:00 às 10:00",
      link: `https://example.com/bookings/${token}`,
    });
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

describe("cancelBookingByClient", () => {
  const statusOf = async (token: string) =>
    (await db.query.bookings.findFirst({ where: eq(bookings.token, token) }))?.status;

  it("cancels before the deadline and frees the slot", async () => {
    const { token } = await createBooking(request());
    vi.setSystemTime(new Date(`${DAY}T07:00:00-03:00`));
    await cancelBookingByClient(token);
    expect(await statusOf(token)).toBe("cancelled");
    await expect(cancelBookingByClient(token)).resolves.toBeUndefined();
    await expect(createBooking(request({ name: "Bia" }))).resolves.toHaveProperty("token");
  });

  it("refuses after the deadline or when the store does not allow it", async () => {
    const { token } = await createBooking(request());
    vi.setSystemTime(new Date(`${DAY}T07:01:00-03:00`));
    await expect(cancelBookingByClient(token)).rejects.toMatchObject({ statusCode: 403 });
    vi.setSystemTime(new Date(`${DAY}T06:00:00-03:00`));
    settings.clientCanCancel = false;
    await expect(cancelBookingByClient(token)).rejects.toMatchObject({ statusCode: 403 });
    expect(await statusOf(token)).toBe("confirmed");
  });

  it("answers 404 for unknown or malformed tokens", async () => {
    await expect(cancelBookingByClient("x".repeat(32))).rejects.toMatchObject({ statusCode: 404 });
    await expect(cancelBookingByClient("../etc")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("cancelBooking by the owner", () => {
  const cancelOnly = async (notifyClient: boolean) => {
    const { token } = await createBooking(request());
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.token, token) });
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await cancelBooking(booking!.id, { notifyClient });
    return { log, token };
  };

  it("tells the client when the owner asks for it", async () => {
    const { log, token } = await cancelOnly(true);
    expect(log).toHaveBeenCalledWith(
      "Notification booking_cancelled to 11912345678",
      expect.objectContaining({ link: `https://example.com/bookings/${token}` }),
    );
  });

  it("stays silent when the owner turns the message off", async () => {
    const { log } = await cancelOnly(false);
    expect(log).not.toHaveBeenCalled();
    expect(await db.query.bookings.findFirst()).toMatchObject({ status: "cancelled" });
  });
});
