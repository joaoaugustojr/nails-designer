// Time convention: instants (bookings, time off, audit columns) are UTC epoch milliseconds;
// working hours are a weekday plus minutes from midnight in `settings.timezone`.
// Column names are snake_case in SQL (drizzle `casing: "snake_case"`).
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamp = () => integer({ mode: "timestamp_ms" });
const createdAt = () =>
  timestamp()
    .notNull()
    .$defaultFn(() => new Date());

export const users = sqliteTable(
  "users",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    email: text().notNull().unique(),
    passwordHash: text().notNull(),
    // owner: the store's owner, exactly one, created at boot. admin: invited panel users.
    role: text({ enum: ["owner", "admin"] })
      .notNull()
      .default("admin"),
    createdAt: createdAt(),
  },
  (t) => [
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_role", sql`${t.role} in ('owner', 'admin')`),
    // At most one owner.
    uniqueIndex("users_single_owner")
      .on(t.role)
      .where(sql`${t.role} = 'owner'`),
  ],
);

// Single row (id = 1): store info, brand and scheduling rules.
export const settings = sqliteTable(
  "settings",
  {
    id: integer().primaryKey().default(1),
    storeName: text().notNull().default(""),
    logoPath: text(),
    coverPath: text(),
    accentColor: text().notNull().default("#a8325a"),
    address: text(),
    whatsapp: text(),
    instagram: text(),
    about: text(),
    thankYouMessage: text(),
    timezone: text().notNull().default("America/Sao_Paulo"),
    slotStepMinutes: integer().notNull().default(30),
    gapMinutes: integer().notNull().default(0),
    minNoticeMinutes: integer().notNull().default(120),
    maxDaysAhead: integer().notNull().default(30),
    clientCanCancel: integer({ mode: "boolean" }).notNull().default(false),
    cancelDeadlineMinutes: integer().notNull().default(120),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`)],
);

export const services = sqliteTable(
  "services",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    details: text().notNull().default(""),
    // One item per line.
    includes: text().notNull().default(""),
    priceCents: integer().notNull(),
    durationMinutes: integer().notNull(),
    active: integer({ mode: "boolean" }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    check("services_price_positive", sql`${t.priceCents} >= 0`),
    check("services_duration_positive", sql`${t.durationMinutes} > 0`),
  ],
);

export const servicePhotos = sqliteTable(
  "service_photos",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    serviceId: integer()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    path: text().notNull(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index("service_photos_service_idx").on(t.serviceId)],
);

export const workingHours = sqliteTable(
  "working_hours",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // 0 = Sunday … 6 = Saturday, as in Date#getDay.
    weekday: integer().notNull(),
    startMinute: integer().notNull(),
    endMinute: integer().notNull(),
  },
  (t) => [
    check("working_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check(
      "working_hours_range",
      sql`${t.startMinute} >= 0 and ${t.startMinute} < ${t.endMinute} and ${t.endMinute} <= 1440`,
    ),
    index("working_hours_weekday_idx").on(t.weekday),
  ],
);

export const timeOff = sqliteTable(
  "time_off",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    startsAt: timestamp().notNull(),
    endsAt: timestamp().notNull(),
    reason: text(),
  },
  (t) => [
    check("time_off_range", sql`${t.startsAt} < ${t.endsAt}`),
    index("time_off_starts_idx").on(t.startsAt),
  ],
);

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // Null once the service is deleted; the snapshot below keeps the history readable.
    serviceId: integer().references(() => services.id, { onDelete: "set null" }),
    serviceName: text().notNull(),
    serviceDurationMinutes: integer().notNull(),
    servicePriceCents: integer().notNull(),
    startsAt: timestamp().notNull(),
    endsAt: timestamp().notNull(),
    clientName: text().notNull(),
    clientPhone: text().notNull(),
    clientEmail: text(),
    remindersOptIn: integer({ mode: "boolean" }).notNull().default(false),
    status: text({ enum: ["confirmed", "cancelled"] })
      .notNull()
      .default("confirmed"),
    // Unguessable token for the client's "my booking" link.
    token: text().notNull().unique(),
    createdAt: createdAt(),
    cancelledAt: timestamp(),
    reminderDaySentAt: timestamp(),
    reminder1hSentAt: timestamp(),
    reminder30mSentAt: timestamp(),
  },
  (t) => [
    check("bookings_range", sql`${t.startsAt} < ${t.endsAt}`),
    check("bookings_status", sql`${t.status} in ('confirmed', 'cancelled')`),
    index("bookings_starts_idx").on(t.startsAt),
  ],
);
