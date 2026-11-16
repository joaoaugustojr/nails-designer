import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database, migrateDatabase } from "./client";
import { servicePhotos, services, users } from "./schema";

// Drizzle wraps driver errors ("Failed query: …"); the SQLite message is on `cause`.
const sqliteError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});

// A real file, not :memory: — libsql opens a new connection per transaction,
// and every connection to :memory: would see its own empty database.
const dir = mkdtempSync(join(tmpdir(), "nails-db-"));
let db: Database;

beforeAll(async () => {
  db = createDatabase(`file:${join(dir, "test.db")}`);
  await migrateDatabase(db);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("database", () => {
  it("enforces foreign keys", async () => {
    await expect(
      db.insert(servicePhotos).values({ serviceId: 999, path: "x.jpg" }),
    ).rejects.toMatchObject(sqliteError(/FOREIGN KEY/));
  });

  it("cascades service photos when a service is deleted", async () => {
    const [service] = await db
      .insert(services)
      .values({ name: "Manicure", priceCents: 5000, durationMinutes: 45 })
      .returning();
    await db.insert(servicePhotos).values({ serviceId: service!.id, path: "a.jpg" });
    await db.delete(services);
    expect(await db.select().from(servicePhotos)).toEqual([]);
  });

  it("allows a single owner and defaults to admin", async () => {
    const base = { name: "x", passwordHash: "x" };
    await db.insert(users).values({ ...base, email: "owner@example.com", role: "owner" });
    const [admin] = await db
      .insert(users)
      .values({ ...base, email: "admin@example.com" })
      .returning();
    expect(admin!.role).toBe("admin");
    await expect(
      db.insert(users).values({ ...base, email: "second@example.com", role: "owner" }),
    ).rejects.toMatchObject(sqliteError(/UNIQUE/));
  });

  it("keeps user emails unique and lowercase", async () => {
    const user = { name: "Aline", email: "aline@example.com", passwordHash: "x" };
    await db.insert(users).values(user);
    await expect(db.insert(users).values(user)).rejects.toMatchObject(sqliteError(/UNIQUE/));
    await expect(
      db.insert(users).values({ ...user, email: "Other@Example.com" }),
    ).rejects.toMatchObject(sqliteError(/CHECK/));
  });
});
