import { asc, eq, sql } from "drizzle-orm";

import { users } from "../db/schema";

async function assertAdminTarget(id: number, ownerMessage: string) {
  const db = await useDb();
  const user = await db.query.users.findFirst({ columns: { role: true }, where: eq(users.id, id) });
  if (!user) throw createError({ statusCode: 404, statusMessage: "User not found" });
  if (user.role === "owner") throw createError({ statusCode: 400, statusMessage: ownerMessage });
}

export async function listPanelUsers() {
  const db = await useDb();
  return db.query.users.findMany({
    columns: { id: true, name: true, email: true, role: true },
    orderBy: [sql`${users.role} = 'owner' desc`, asc(users.id)],
  });
}

export async function createPanelUser(user: { name: string; email: string; password: string }) {
  const db = await useDb();
  const existing = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, user.email),
  });
  if (existing) throw createError({ statusCode: 409, statusMessage: "Email already in use" });

  const [created] = await db
    .insert(users)
    .values({
      name: user.name,
      email: user.email,
      passwordHash: await hashPassword(user.password),
      role: "admin",
    })
    .returning({ id: users.id });
  return created!;
}

export async function deletePanelUser(id: number) {
  await assertAdminTarget(id, "The owner cannot be removed");
  const db = await useDb();
  await db.delete(users).where(eq(users.id, id));
}

export async function resetPanelUserPassword(id: number, password: string) {
  await assertAdminTarget(id, "The owner changes her own password");
  const db = await useDb();
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, id));
}
