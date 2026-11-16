import { eq } from "drizzle-orm";
import { z } from "zod";

import { users } from "../../db/schema";

const body = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, body.parse);
  const db = await useDb();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  // Same answer for an unknown email and a wrong password.
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, statusMessage: "Invalid email or password" });
  }

  await startPanelSession(event, user);
  return { ok: true };
});
