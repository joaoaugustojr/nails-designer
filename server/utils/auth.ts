import { eq } from "drizzle-orm";
import type { H3Event } from "h3";

import { users } from "../db/schema";

/**
 * The signed-in panel user. Sessions are sealed cookies with no server-side state,
 * so a removed user's cookie would stay valid until it expires: check the database too.
 */
export async function requirePanelUser(event: H3Event) {
  const { user } = await requireUserSession(event);
  const db = await useDb();
  const current = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, role: true },
    where: eq(users.id, user.id),
  });

  if (!current) {
    await clearUserSession(event);
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return current;
}
