// Time convention: instants (bookings, time off, audit columns) are UTC epoch milliseconds;
// working hours are a weekday plus minutes from midnight in `settings.timezone`.
// Column names are snake_case in SQL (drizzle `casing: "snake_case"`).
import { relations, sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { WaitlistPeriod } from "../../shared/schemas/waitlist";
import { DEFAULT_TIMEZONE } from "../../shared/utils/time";

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
    // Bumped on password change; sessions carrying an older value are rejected.
    sessionVersion: integer().notNull().default(0),
    // owner: the store's owner, exactly one, created at boot. admin: created by the owner.
    role: text({ enum: ["owner", "admin"] })
      .notNull()
      .default("admin"),
    createdAt: createdAt(),
  },
  (t) => [
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_role", sql`${t.role} in ('owner', 'admin')`),
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
    // Ordered list of upload paths; the site cycles through them.
    coverPaths: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    accentColor: text().notNull().default("#a8325a"),
    address: text(),
    // "lat,lng": map links open this exact point instead of searching the address text.
    mapLocation: text(),
    whatsapp: text(),
    instagram: text(),
    about: text(),
    thankYouMessage: text(),
    timezone: text().notNull().default(DEFAULT_TIMEZONE),
    slotStepMinutes: integer().notNull().default(30),
    gapMinutes: integer().notNull().default(0),
    minNoticeMinutes: integer().notNull().default(120),
    maxDaysAhead: integer().notNull().default(30),
    clientCanCancel: integer({ mode: "boolean" }).notNull().default(false),
    cancelDeadlineMinutes: integer().notNull().default(120),
    isWaitlistEnabled: integer({ mode: "boolean" }).notNull().default(true),
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

export const servicesRelations = relations(services, ({ many }) => ({
  photos: many(servicePhotos),
}));

export const servicePhotosRelations = relations(servicePhotos, ({ one }) => ({
  service: one(services, { fields: [servicePhotos.serviceId], references: [services.id] }),
}));

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

// A client is identified by her phone (digits only, Brazilian local format). Her name is the
// one given in her latest booking; each booking keeps the name used that day.
export const clients = sqliteTable(
  "clients",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    phone: text().notNull().unique(),
    name: text().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [check("clients_phone_digits", sql`${t.phone} <> '' and ${t.phone} not glob '*[^0-9]*'`)],
);

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // Null once the service is deleted; the snapshot below keeps the history readable.
    serviceId: integer().references(() => services.id, { onDelete: "set null" }),
    // Null once the client is removed; her bookings stay, anonymized, for the store's history.
    clientId: integer().references(() => clients.id, { onDelete: "set null" }),
    serviceName: text().notNull(),
    serviceDurationMinutes: integer().notNull(),
    servicePriceCents: integer().notNull(),
    startsAt: timestamp().notNull(),
    endsAt: timestamp().notNull(),
    clientName: text().notNull(),
    clientPhone: text().notNull(),
    remindersOptIn: integer({ mode: "boolean" }).notNull().default(false),
    status: text({ enum: ["confirmed", "cancelled"] })
      .notNull()
      .default("confirmed"),
    // Unguessable token for the client's "my booking" link.
    token: text().notNull().unique(),
    // Sent by the booking form; a repeated submit finds the booking already made.
    idempotencyKey: text().unique(),
    createdAt: createdAt(),
    cancelledAt: timestamp(),
    reminderDayBeforeSentAt: timestamp(),
    reminderDaySentAt: timestamp(),
    reminder1hSentAt: timestamp(),
    reminder30mSentAt: timestamp(),
  },
  (t) => [
    check("bookings_range", sql`${t.startsAt} < ${t.endsAt}`),
    check("bookings_status", sql`${t.status} in ('confirmed', 'cancelled')`),
    index("bookings_starts_idx").on(t.startsAt),
    index("bookings_client_idx").on(t.clientId),
  ],
);

export const clientsRelations = relations(clients, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  client: one(clients, { fields: [bookings.clientId], references: [clients.id] }),
}));

// Clients asking to be called when a slot opens. Personal data is kept only while it can
// still be useful (LGPD): a request is deleted once resolved, booked, or past its last day.
export const waitlistRequests = sqliteTable(
  "waitlist_requests",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    serviceId: integer().references(() => services.id, { onDelete: "set null" }),
    serviceName: text().notNull(),
    clientName: text().notNull(),
    clientPhone: text().notNull(),
    dates: text({ mode: "json" }).$type<string[]>().notNull(),
    periods: text({ mode: "json" }).$type<WaitlistPeriod[]>().notNull(),
    note: text().notNull().default(""),
    lastDate: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("waitlist_requests_last_date_idx").on(t.lastDate)],
);
