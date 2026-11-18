import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, migrateDatabase } from "../db/client";
import { bookings, clients, services, waitlistRequests, workingHours } from "../db/schema";
import { createPanelBooking } from "./bookings";
import * as notifications from "./notifications";
import { createWaitlistRequest, listWaitlist } from "./waitlist";

vi.stubGlobal("createError", (error: object) => Object.assign(new Error(), error));
const dir = mkdtempSync(join(tmpdir(), "nails-waitlist-"));
const db = createDatabase(`file:${join(dir, "test.db")}`);
vi.stubGlobal("useDb", async () => db);
vi.stubGlobal("useRuntimeConfig", () => ({
  siteUrl: "https://example.com",
  public: { isWhatsappEnabled: true },
}));
const settings = {
  storeName: "Studio",
  timezone: "America/Sao_Paulo",
  whatsapp: "11999990000",
  isWaitlistEnabled: true,
  slotStepMinutes: 30,
  gapMinutes: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 10,
};
vi.stubGlobal("readSettings", async () => settings);
vi.stubGlobal("storeTimezone", async () => settings.timezone);

let serviceId: number;

const request = (changes: Partial<Parameters<typeof createWaitlistRequest>[0]> = {}) => ({
  serviceId,
  name: "Ana",
  phone: "11912345678",
  dates: ["2026-11-19", "2026-11-20"],
  periods: ["morning" as const],
  note: "",
  website: "",
  ...changes,
});

beforeEach(async () => {
  settings.isWaitlistEnabled = true;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T08:00:00-03:00"));
  await migrateDatabase(db);
  for (const table of [waitlistRequests, bookings, clients, services, workingHours]) {
    await db.delete(table);
  }
  const weekdaysExceptSunday = [1, 2, 3, 4, 5, 6];
  await db
    .insert(workingHours)
    .values(
      weekdaysExceptSunday.map((weekday) => ({ weekday, startMinute: 540, endMinute: 1080 })),
    );
  const [service] = await db
    .insert(services)
    .values({ name: "Gel", priceCents: 6500, durationMinutes: 60 })
    .returning({ id: services.id });
  serviceId = service!.id;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("createWaitlistRequest", () => {
  it("saves the request and tells the owner on WhatsApp", async () => {
    const sent = vi.spyOn(notifications, "notify");
    await createWaitlistRequest(request());
    expect(await db.query.waitlistRequests.findFirst()).toMatchObject({
      serviceName: "Gel",
      dates: ["2026-11-19", "2026-11-20"],
      lastDate: "2026-11-20",
    });
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ to: "11999990000", template: "waitlist_request" }),
    );
  });

  it("refuses requests while the waitlist is off", async () => {
    settings.isWaitlistEnabled = false;
    await expect(createWaitlistRequest(request())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("refuses days the store does not open", async () => {
    await expect(createWaitlistRequest(request({ dates: ["2026-11-22"] }))).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(createWaitlistRequest(request({ dates: ["2026-11-17"] }))).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(createWaitlistRequest(request({ dates: ["2026-11-29"] }))).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("listWaitlist", () => {
  it("drops requests whose days have all passed", async () => {
    await createWaitlistRequest(request({ dates: ["2026-11-19"] }));
    await createWaitlistRequest(request({ name: "Bia", dates: ["2026-11-25"] }));
    vi.setSystemTime(new Date("2026-11-20T08:00:00-03:00"));
    expect((await listWaitlist()).map((item) => item.clientName)).toEqual(["Bia"]);
  });
});

describe("booking from the waitlist", () => {
  const booking = (changes: Partial<Parameters<typeof createPanelBooking>[0]> = {}) => ({
    serviceId,
    date: "2026-11-19",
    startMinute: 600,
    priceCents: 6500,
    name: "Ana",
    phone: "11912345678",
    remindersOptIn: false,
    ...changes,
  });

  it("removes the request once the client is booked for that service", async () => {
    await createWaitlistRequest(request());
    await createPanelBooking(booking());
    expect(await listWaitlist()).toEqual([]);
  });

  it("keeps the request when someone else is booked", async () => {
    await createWaitlistRequest(request());
    await createPanelBooking(booking({ name: "Bia", phone: "11987654321" }));
    expect(await listWaitlist()).toHaveLength(1);
  });
});
