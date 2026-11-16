import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, migrateDatabase } from "../db/client";
import { users } from "../db/schema";
import { createPanelUser, deletePanelUser, listPanelUsers, resetPanelUserPassword } from "./users";

// createError is a Nuxt server auto-import; a plain stand-in is enough here.
vi.stubGlobal("createError", (error: object) => Object.assign(new Error(), error));
vi.stubGlobal("hashPassword", async (password: string) => `hashed:${password}`);

const dir = mkdtempSync(join(tmpdir(), "nails-users-"));
const db = createDatabase(`file:${join(dir, "test.db")}`);
vi.stubGlobal("useDb", async () => db);
let ownerId: number;

beforeEach(async () => {
  await migrateDatabase(db);
  await db.delete(users);
  const [owner] = await db
    .insert(users)
    .values({ name: "Owner", email: "owner@example.com", passwordHash: "x", role: "owner" })
    .returning({ id: users.id });
  ownerId = owner!.id;
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("panel users", () => {
  it("creates admins and lists the owner first", async () => {
    await createPanelUser({ name: "Ana", email: "ana@example.com", password: "x" });
    const list = await listPanelUsers();
    expect(list.map((user) => [user.name, user.role])).toEqual([
      ["Owner", "owner"],
      ["Ana", "admin"],
    ]);
  });

  it("refuses an email already in use", async () => {
    await expect(
      createPanelUser({ name: "Copy", email: "owner@example.com", password: "x" }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("removes admins but never the owner", async () => {
    const { id } = await createPanelUser({
      name: "Ana",
      email: "ana@example.com",
      password: "x",
    });
    await deletePanelUser(id);
    await expect(deletePanelUser(ownerId)).rejects.toMatchObject({ statusCode: 400 });
    await expect(deletePanelUser(9999)).rejects.toMatchObject({ statusCode: 404 });
    expect((await listPanelUsers()).map((user) => user.name)).toEqual(["Owner"]);
  });

  it("resets an admin's password and ends her sessions, but not the owner's", async () => {
    const { id } = await createPanelUser({
      name: "Ana",
      email: "ana@example.com",
      password: "old",
    });
    await resetPanelUserPassword(id, "new");
    const [ana] = await db.select().from(users).where(eq(users.id, id));
    expect(ana).toMatchObject({ passwordHash: "hashed:new", sessionVersion: 1 });
    await expect(resetPanelUserPassword(ownerId, "x")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
