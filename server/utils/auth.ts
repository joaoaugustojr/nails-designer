import { eq, sql } from "drizzle-orm";
import type { H3Event } from "h3";

import type { User } from "#auth-utils";

import { users } from "../db/schema";

// Only these fields go into the cookie (never the password hash); the version ties the session
// to the user's current password.
export async function startPanelSession(event: H3Event, user: User & { sessionVersion: number }) {
  const { id, name, email, role, sessionVersion } = user;
  await replaceUserSession(event, { user: { id, name, email, role }, secure: { sessionVersion } });
}

/**
 * The signed-in panel user. Sessions are sealed cookies with no server-side state, so a removed
 * user, or a session older than her last password change, would stay valid: check the database.
 */
export async function requirePanelUser(event: H3Event): Promise<User> {
  const { user, secure } = await requireUserSession(event);
  const db = await useDb();
  const current = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, role: true, sessionVersion: true },
    where: eq(users.id, user.id),
  });

  if (!current || current.sessionVersion !== secure?.sessionVersion) {
    await clearUserSession(event);
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const { id, name, email, role } = current;
  return { id, name, email, role };
}

// Loaded by server/middleware/panel-auth.ts for every /api/admin/** request.
export function currentPanelUser(event: H3Event) {
  const user = event.context.panelUser;
  if (!user) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  return user;
}

export function requireOwner(event: H3Event) {
  const user = currentPanelUser(event);
  if (user.role !== "owner") {
    throw createError({ statusCode: 403, statusMessage: "Only the owner can do this" });
  }
  return user;
}

export async function updateOwnProfile(event: H3Event, name: string) {
  const db = await useDb();
  const [updated] = await db
    .update(users)
    .set({ name })
    .where(eq(users.id, currentPanelUser(event).id))
    .returning();
  await startPanelSession(event, updated!);
  return { name: updated!.name };
}

// Bumping the session version signs out every other device; this one gets a fresh session.
export async function changeOwnPassword(
  event: H3Event,
  { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
) {
  const db = await useDb();
  const { id } = currentPanelUser(event);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw createError({ statusCode: 400, statusMessage: "Current password is incorrect" });
  }

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, id))
    .returning();
  await startPanelSession(event, updated!);
}
