import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { users } from "../db/schema";

export async function listPanelUsers(db: Database) {
  return db.query.users.findMany({
    columns: { id: true, name: true, email: true, role: true },
    // The owner first, then by creation.
    orderBy: [sql`${users.role} = 'owner' desc`, asc(users.id)],
  });
}

export async function createPanelUser(
  db: Database,
  user: { name: string; email: string; passwordHash: string },
) {
  const existing = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, user.email),
  });
  if (existing) throw createError({ statusCode: 409, statusMessage: "Email already in use" });

  const [created] = await db
    .insert(users)
    .values({ ...user, role: "admin" })
    .returning({ id: users.id });
  return created!;
}

export async function deletePanelUser(db: Database, id: number) {
  const user = await db.query.users.findFirst({ columns: { role: true }, where: eq(users.id, id) });
  if (!user) throw createError({ statusCode: 404, statusMessage: "User not found" });
  if (user.role === "owner") {
    throw createError({ statusCode: 400, statusMessage: "The owner cannot be removed" });
  }
  await db.delete(users).where(eq(users.id, id));
}

// The owner sets a new password for an admin who forgot hers; the admin's sessions end.
export async function resetPanelUserPassword(db: Database, id: number, passwordHash: string) {
  const user = await db.query.users.findFirst({ columns: { role: true }, where: eq(users.id, id) });
  if (!user) throw createError({ statusCode: 404, statusMessage: "User not found" });
  if (user.role === "owner") {
    throw createError({ statusCode: 400, statusMessage: "The owner changes her own password" });
  }
  await db
    .update(users)
    .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, id));
}
