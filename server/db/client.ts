import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import * as schema from "./schema";

// Relative to the working directory: the project root in dev, /app in the image.
const MIGRATIONS_FOLDER = "server/db/migrations";

// libsql turns foreign_keys on for every connection it opens; `timeout` is the busy timeout.
export function createDatabase(url: string) {
  if (url.startsWith("file:")) {
    mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  }
  const client = createClient({ url, timeout: 5000 });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDatabase>;

export async function migrateDatabase(db: Database, migrationsFolder = MIGRATIONS_FOLDER) {
  // Persistent: stored in the file, so setting it once at boot is enough.
  await db.run(sql`PRAGMA journal_mode = WAL`);
  await migrate(db, { migrationsFolder });
}
