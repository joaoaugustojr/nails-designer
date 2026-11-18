import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, type Database, migrateDatabase } from "../db/client";
import { bookings, clients } from "../db/schema";
import {
  CLIENTS_PAGE_SIZE,
  listClients,
  removeClient,
  REMOVED_CLIENT_NAME,
  upsertClient,
} from "./clients";

const dir = mkdtempSync(join(tmpdir(), "nails-clients-"));
const db: Database = createDatabase(`file:${join(dir, "test.db")}`);
// useDb is a Nuxt server auto-import; point it at the test database.
vi.stubGlobal("useDb", async () => db);
vi.stubGlobal("createError", (error: object) => Object.assign(new Error(), error));
const NOW = new Date("2026-11-17T12:00:00Z");
const HOUR = 60 * 60 * 1000;
let tokens = 0;

async function book(
  client: { phone: string; name: string },
  hoursFromNow: number,
  {
    priceCents = 5000,
    status = "confirmed" as "confirmed" | "cancelled",
    createdHoursAgo = 0,
  } = {},
) {
  const [{ id }] = (await upsertClient(db, client).returning({ id: clients.id })) as [
    { id: number },
  ];
  const startsAt = new Date(NOW.getTime() + hoursFromNow * HOUR);
  const [booking] = await db
    .insert(bookings)
    .values({
      clientId: id,
      clientName: client.name,
      clientPhone: client.phone,
      serviceName: "Manicure",
      serviceDurationMinutes: 60,
      servicePriceCents: priceCents,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status,
      token: `t${tokens++}`,
      createdAt: new Date(NOW.getTime() - createdHoursAgo * HOUR),
    })
    .returning({ id: bookings.id });
  return booking!;
}

beforeEach(async () => {
  await migrateDatabase(db);
  await db.delete(bookings);
  await db.delete(clients);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("upsertClient", () => {
  it("keeps one client per phone with the latest name", async () => {
    const save = (name: string) =>
      upsertClient(db, { phone: "11912345678", name }).returning({ id: clients.id });
    const [first] = await save("Maria");
    const [second] = await save("Maria Souza");
    expect(second!.id).toBe(first!.id);
    expect(await db.select({ name: clients.name }).from(clients)).toEqual([
      { name: "Maria Souza" },
    ]);
  });
});

describe("queryClients", () => {
  it("counts visits, spending, last and next visit and cancellations", async () => {
    const maria = { phone: "11900000001", name: "Maria" };
    await book(maria, -48, { priceCents: 6000 });
    await book(maria, -24, { priceCents: 4000 });
    await book(maria, -12, { status: "cancelled" });
    const next = await book(maria, 30);

    const { items } = await listClients({ now: NOW });
    expect(items[0]).toMatchObject({
      name: "Maria",
      visits: 2,
      spentCents: 10000,
      lastVisitAt: NOW.getTime() - 24 * HOUR,
      nextVisitAt: NOW.getTime() + 30 * HOUR,
      nextBookingId: next.id,
      nextServiceName: "Manicure",
      cancellations: 1,
    });
  });

  it("points to the soonest confirmed upcoming booking when there are several", async () => {
    const maria = { phone: "11900000001", name: "Maria" };
    await book(maria, 72);
    const soonest = await book(maria, 30);
    await book(maria, 10, { status: "cancelled" });
    await book(maria, -5);

    const { items } = await listClients({ now: NOW });
    expect(items[0]).toMatchObject({
      nextVisitAt: NOW.getTime() + 30 * HOUR,
      nextBookingId: soonest.id,
    });
  });

  it("has no next booking when every upcoming one is cancelled", async () => {
    await book({ phone: "11900000001", name: "Maria" }, 30, { status: "cancelled" });

    const { items } = await listClients({ now: NOW });
    expect(items[0]).toMatchObject({
      nextVisitAt: null,
      nextBookingId: null,
      nextServiceName: null,
    });
  });

  it("lists clients with upcoming bookings first, soonest first, then the most recently active", async () => {
    await book({ phone: "11900000001", name: "Recent, nothing ahead" }, -2, { createdHoursAgo: 1 });
    await book({ phone: "11900000002", name: "Next week" }, 24 * 7, { createdHoursAgo: 90 });
    await book({ phone: "11900000003", name: "Tomorrow" }, 24, { createdHoursAgo: 80 });
    await book({ phone: "11900000004", name: "Old, nothing ahead" }, -100, {
      createdHoursAgo: 100,
    });

    const { items } = await listClients({ now: NOW });
    expect(items.map((item) => item.name)).toEqual([
      "Tomorrow",
      "Next week",
      "Recent, nothing ahead",
      "Old, nothing ahead",
    ]);
  });

  it("searches by name or phone digits", async () => {
    await upsertClient(db, { phone: "11912345678", name: "Maria Souza" });
    await upsertClient(db, { phone: "21987654321", name: "Juliana" });

    const byName = await listClients({ search: "souza", now: NOW });
    const byPhone = await listClients({ search: "(21) 9876", now: NOW });
    const literal = await listClients({ search: "%", now: NOW });
    expect(byName.items.map((item) => item.name)).toEqual(["Maria Souza"]);
    expect(byPhone.items.map((item) => item.name)).toEqual(["Juliana"]);
    expect(literal.total).toBe(0);
  });

  it("pages through the list", async () => {
    for (let index = 0; index < CLIENTS_PAGE_SIZE + 3; index++) {
      await upsertClient(db, {
        phone: `119000000${String(index).padStart(2, "0")}`,
        name: `C${index}`,
      });
    }
    const first = await listClients({ now: NOW });
    const second = await listClients({ offset: CLIENTS_PAGE_SIZE, now: NOW });
    expect(first).toMatchObject({ total: CLIENTS_PAGE_SIZE + 3, hasMore: true });
    expect(first.items).toHaveLength(CLIENTS_PAGE_SIZE);
    expect(second).toMatchObject({ hasMore: false });
    expect(second.items).toHaveLength(3);
  });
});

describe("removeClient", () => {
  const ana = { phone: "11912345678", name: "Ana" };
  const clientIdOf = async (phone: string) =>
    (await db.query.clients.findFirst({ where: eq(clients.phone, phone) }))?.id;

  it("erases her data, keeps her bookings, and lets her book again as a new client", async () => {
    const past = await book(ana, -48);
    const id = (await clientIdOf(ana.phone))!;

    await removeClient(id, NOW);

    expect(await clientIdOf(ana.phone)).toBeUndefined();
    const kept = await db.query.bookings.findFirst({ where: eq(bookings.id, past.id) });
    expect(kept).toMatchObject({
      clientId: null,
      clientName: REMOVED_CLIENT_NAME,
      clientPhone: "",
    });

    await book(ana, 24);
    expect(await clientIdOf(ana.phone)).not.toBe(id);
  });

  it("refuses while she has an upcoming booking", async () => {
    await book(ana, 24);
    await expect(removeClient((await clientIdOf(ana.phone))!, NOW)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
