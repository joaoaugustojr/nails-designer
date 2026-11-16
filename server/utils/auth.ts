import { eq, sql } from "drizzle-orm";
import type { H3Event } from "h3";

import { users } from "../db/schema";

type PanelUser = { id: number; name: string; email: string; role: "owner" | "admin" };

// Writes the session for a panel user; the version ties it to her current password.
// Only the listed fields go into the cookie: never pass the password hash along.
export async function startPanelSession(
  event: H3Event,
  user: PanelUser & { sessionVersion: number },
) {
  const { id, name, email, role, sessionVersion } = user;
  await replaceUserSession(event, { user: { id, name, email, role }, secure: { sessionVersion } });
}

/**
 * The signed-in panel user. Sessions are sealed cookies with no server-side state, so a removed
 * user, or a session older than her last password change, would stay valid: check the database.
 */
export async function requirePanelUser(event: H3Event) {
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
  const { sessionVersion: _version, ...profile } = current;
  return profile;
}

export function requireOwner(event: H3Event) {
  const user = event.context.panelUser;
  if (user?.role !== "owner") {
    throw createError({ statusCode: 403, statusMessage: "Only the owner can do this" });
  }
  return user;
}

export async function updateOwnProfile(event: H3Event, name: string) {
  const db = await useDb();
  const [updated] = await db
    .update(users)
    .set({ name })
    .where(eq(users.id, event.context.panelUser!.id))
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
  const id = event.context.panelUser!.id;
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
