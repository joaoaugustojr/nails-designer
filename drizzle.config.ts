import { defineConfig } from "drizzle-kit";

// Only used to generate migrations (`pnpm db:generate`); they are applied at server boot.
export default defineConfig({
  dialect: "sqlite",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  casing: "snake_case",
});
