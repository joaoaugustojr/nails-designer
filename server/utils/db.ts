import { createDatabase, type Database, migrateDatabase } from "../db/client";
import { settings, users } from "../db/schema";

let ready: Promise<Database> | undefined;

/**
 * The database, migrated and seeded. The first call runs the setup; every caller
 * awaits the same promise, so no request can touch the database before migrations end.
 */
export function useDb() {
  return (ready ??= setup());
}

async function setup() {
  const config = useRuntimeConfig();
  const db = createDatabase(config.dbUrl);
  await migrateDatabase(db);
  // The store name only seeds the settings row; afterwards it is edited in the panel.
  await db.insert(settings).values({ id: 1, storeName: config.storeName }).onConflictDoNothing();
  await bootstrapAdmin(db, config.admin);
  return db;
}

// The owner (first panel user) comes from env vars, and only while the users table is empty.
async function bootstrapAdmin(
  db: Database,
  admin: { name: string; email: string; password: string },
) {
  if (await db.$count(users)) return;

  if (!admin.email || !admin.password) {
    console.warn("No panel user yet: set NUXT_ADMIN_EMAIL and NUXT_ADMIN_PASSWORD to create one.");
    return;
  }

  await db.insert(users).values({
    name: admin.name || admin.email,
    email: admin.email.trim().toLowerCase(),
    passwordHash: await hashPassword(admin.password),
    role: "owner",
  });
  console.info(`Created panel user ${admin.email}.`);
}
