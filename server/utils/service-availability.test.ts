import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, migrateDatabase } from "../db/client";
import { bookings, clients, services, timeOff, workingHours } from "../db/schema";
import { findServiceAvailability } from "./availability";

vi.stubGlobal("createError", (error: object) => Object.assign(new Error(), error));
const dir = mkdtempSync(join(tmpdir(), "nails-availability-"));
const db = createDatabase(`file:${join(dir, "test.db")}`);
vi.stubGlobal("useDb", async () => db);
const settings = {
  timezone: "America/Sao_Paulo",
  slotStepMinutes: 30,
  gapMinutes: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 3,
};
vi.stubGlobal("readSettings", async () => settings);

const at = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`);
let serviceId: number;
let clientId: number;

async function book(start: string, end: string, status: "confirmed" | "cancelled") {
  await db.insert(bookings).values({
    serviceId,
    clientId,
    serviceName: "Gel",
    serviceDurationMinutes: 60,
    servicePriceCents: 5000,
    startsAt: at("2026-11-18", start),
    endsAt: at("2026-11-18", end),
    clientName: "Ana",
    clientPhone: "11912345678",
    status,
    token: `${start}-${status}`,
  });
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-17", "08:00"));
  await migrateDatabase(db);
  for (const table of [bookings, clients, timeOff, workingHours, services]) await db.delete(table);
  const [service] = await db
    .insert(services)
    .values({ name: "Gel", priceCents: 5000, durationMinutes: 60 })
    .returning({ id: services.id });
  serviceId = service!.id;
  const [client] = await db
    .insert(clients)
    .values({ phone: "11912345678", name: "Ana" })
    .returning({ id: clients.id });
  clientId = client!.id;
  // 2026-11-17 is a Tuesday (2); Wednesday (3) also works, Thursday (4) does not.
  await db.insert(workingHours).values([
    { weekday: 2, startMinute: 9 * 60, endMinute: 11 * 60 },
    { weekday: 3, startMinute: 9 * 60, endMinute: 11 * 60 },
  ]);
});

afterEach(() => vi.useRealTimers());
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const startsByDate = async (query: { from?: string; days: number }) =>
  (await findServiceAvailability(serviceId, query)).days.map(
    (day) => `${day.date}: ${day.startMinutes.map((minute) => minute / 60).join(" ")}`,
  );

describe("findServiceAvailability", () => {
  it("maps each date to its weekday's hours and stops at the open agenda", async () => {
    expect(await startsByDate({ days: 6 })).toEqual([
      "2026-11-17: 9 9.5 10",
      "2026-11-18: 9 9.5 10",
      "2026-11-19: ",
      "2026-11-20: ",
    ]);
  });

  it("starts at today when asked for an earlier date", async () => {
    const result = await findServiceAvailability(serviceId, { from: "2026-11-01", days: 1 });
    expect(result.days.map((day) => day.date)).toEqual(["2026-11-17"]);
    expect([result.firstDate, result.lastDate]).toEqual(["2026-11-17", "2026-11-20"]);
  });

  it("blocks confirmed bookings and time off, ignoring cancelled bookings", async () => {
    await book("09:00", "10:00", "confirmed");
    await book("10:00", "11:00", "cancelled");
    await db
      .insert(timeOff)
      .values({ startsAt: at("2026-11-17", "00:00"), endsAt: at("2026-11-18", "00:00") });
    expect(await startsByDate({ days: 2 })).toEqual(["2026-11-17: ", "2026-11-18: 10"]);
  });

  it("refuses inactive or unknown services", async () => {
    await db.update(services).set({ active: false });
    await expect(findServiceAvailability(serviceId, { days: 1 })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(findServiceAvailability(9999, { days: 1 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
