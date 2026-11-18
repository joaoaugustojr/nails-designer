import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, migrateDatabase } from "../db/client";
import { bookings, clients } from "../db/schema";
import { sendDueOwnerReminders, sendDueReminders } from "./reminders";

const dir = mkdtempSync(join(tmpdir(), "nails-reminders-"));
const db = createDatabase(`file:${join(dir, "test.db")}`);
vi.stubGlobal("useDb", async () => db);
vi.stubGlobal("readSettings", async () => ({ storeName: "Studio", timezone: "America/Sao_Paulo" }));
const runtimeConfig = { siteUrl: "https://example.com", public: { isWhatsappEnabled: true } };
vi.stubGlobal("useRuntimeConfig", () => runtimeConfig);

const at = (time: string) => new Date(`2026-11-18T${time}:00-03:00`).getTime();
const log = vi.spyOn(console, "info").mockImplementation(() => {});

let clientId: number;

type BookingChanges = Partial<
  Pick<typeof bookings.$inferInsert, "createdAt" | "remindersOptIn" | "status">
>;

async function book(changes: BookingChanges = {}) {
  await db.insert(bookings).values({
    clientId,
    serviceName: "Gel",
    serviceDurationMinutes: 60,
    servicePriceCents: 6500,
    startsAt: new Date(at("14:00")),
    endsAt: new Date(at("15:00")),
    clientName: "Ana Souza",
    clientPhone: "11912345678",
    remindersOptIn: true,
    token: "t".repeat(32),
    createdAt: new Date("2026-11-16T12:00:00-03:00"),
    ...changes,
  });
}

const sentCountAt = async (now: string) => {
  await sendDueReminders(new Date(now).getTime());
  return log.mock.calls.length;
};

beforeEach(async () => {
  await migrateDatabase(db);
  for (const table of [bookings, clients]) await db.delete(table);
  const [client] = await db
    .insert(clients)
    .values({ phone: "11912345678", name: "Ana" })
    .returning({ id: clients.id });
  clientId = client!.id;
  log.mockClear();
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("sendDueReminders", () => {
  it("sends the day before, the morning of, 1 h and 30 min before, each once", async () => {
    await book();
    expect(await sentCountAt("2026-11-17T13:55:00-03:00")).toBe(0);
    expect(await sentCountAt("2026-11-17T14:00:00-03:00")).toBe(1);
    expect(await sentCountAt("2026-11-17T14:05:00-03:00")).toBe(1);
    expect(await sentCountAt("2026-11-18T08:00:00-03:00")).toBe(2);
    expect(await sentCountAt("2026-11-18T13:00:00-03:00")).toBe(3);
    expect(await sentCountAt("2026-11-18T13:30:00-03:00")).toBe(4);
    expect(await sentCountAt("2026-11-18T13:55:00-03:00")).toBe(4);
    expect(log).toHaveBeenLastCalledWith(
      "Notification booking_reminder to 11912345678",
      expect.objectContaining({ when: "Quarta, 18 de novembro · 14:00 às 15:00" }),
    );
  });

  it("sends only the latest of several overdue reminders", async () => {
    await book();
    expect(await sentCountAt("2026-11-18T13:40:00-03:00")).toBe(1);
    expect(await sentCountAt("2026-11-18T13:45:00-03:00")).toBe(1);
  });

  it("skips reminders that were due before the booking was made", async () => {
    await book({ createdAt: new Date("2026-11-18T09:00:00-03:00") });
    expect(await sentCountAt("2026-11-18T09:05:00-03:00")).toBe(0);
    expect(await sentCountAt("2026-11-18T13:00:00-03:00")).toBe(1);
  });

  it("sends nothing without the opt-in or after a cancellation", async () => {
    await book({ remindersOptIn: false });
    expect(await sentCountAt("2026-11-18T13:30:00-03:00")).toBe(0);
    await db.delete(bookings);
    await book({ status: "cancelled" });
    expect(await sentCountAt("2026-11-18T13:30:00-03:00")).toBe(0);
  });
});

describe("sendDueOwnerReminders", () => {
  const ownerCountAt = (now: string) => sendDueOwnerReminders(new Date(now).getTime());

  it("reminds the owner 30 min before, once, whatever the client's opt-in", async () => {
    await book({ remindersOptIn: false });
    expect(await ownerCountAt("2026-11-18T13:29:00-03:00")).toBe(0);
    expect(await ownerCountAt("2026-11-18T13:30:00-03:00")).toBe(1);
    expect(await ownerCountAt("2026-11-18T13:31:00-03:00")).toBe(0);
  });

  it("skips bookings made inside the window or cancelled", async () => {
    await book({ createdAt: new Date("2026-11-18T13:45:00-03:00") });
    expect(await ownerCountAt("2026-11-18T13:46:00-03:00")).toBe(0);
    await db.delete(bookings);
    await book({ status: "cancelled" });
    expect(await ownerCountAt("2026-11-18T13:30:00-03:00")).toBe(0);
  });
});
