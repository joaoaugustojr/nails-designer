import { eq } from "drizzle-orm";

import { settings } from "../db/schema";

export const SETTINGS_ID = 1;

export async function readSettings() {
  const db = await useDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.id, SETTINGS_ID) });
  return row!;
}

export async function writeSettings(changes: Partial<typeof settings.$inferInsert>) {
  const db = await useDb();
  await db.update(settings).set(changes).where(eq(settings.id, SETTINGS_ID));
}

export async function storeTimezone() {
  return (await readSettings()).timezone;
}
