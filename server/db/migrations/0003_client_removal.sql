PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer,
	`client_id` integer,
	`service_name` text NOT NULL,
	`service_duration_minutes` integer NOT NULL,
	`service_price_cents` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`client_name` text NOT NULL,
	`client_phone` text NOT NULL,
	`reminders_opt_in` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`token` text NOT NULL,
	`idempotency_key` text,
	`created_at` integer NOT NULL,
	`cancelled_at` integer,
	`reminder_day_before_sent_at` integer,
	`reminder_day_sent_at` integer,
	`reminder1h_sent_at` integer,
	`reminder30m_sent_at` integer,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "bookings_range" CHECK("__new_bookings"."starts_at" < "__new_bookings"."ends_at"),
	CONSTRAINT "bookings_status" CHECK("__new_bookings"."status" in ('confirmed', 'cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_bookings`("id", "service_id", "client_id", "service_name", "service_duration_minutes", "service_price_cents", "starts_at", "ends_at", "client_name", "client_phone", "reminders_opt_in", "status", "token", "idempotency_key", "created_at", "cancelled_at", "reminder_day_before_sent_at", "reminder_day_sent_at", "reminder1h_sent_at", "reminder30m_sent_at") SELECT "id", "service_id", "client_id", "service_name", "service_duration_minutes", "service_price_cents", "starts_at", "ends_at", "client_name", "client_phone", "reminders_opt_in", "status", "token", "idempotency_key", "created_at", "cancelled_at", "reminder_day_before_sent_at", "reminder_day_sent_at", "reminder1h_sent_at", "reminder30m_sent_at" FROM `bookings`;--> statement-breakpoint
DROP TABLE `bookings`;--> statement-breakpoint
ALTER TABLE `__new_bookings` RENAME TO `bookings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_unique` ON `bookings` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_idempotencyKey_unique` ON `bookings` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `bookings_starts_idx` ON `bookings` (`starts_at`);--> statement-breakpoint
CREATE INDEX `bookings_client_idx` ON `bookings` (`client_id`);--> statement-breakpoint
-- Dropping the old table dropped its overlap triggers; recreate them as in 0000_init.
CREATE TRIGGER `bookings_no_overlap_insert`
BEFORE INSERT ON `bookings`
WHEN NEW.`status` = 'confirmed' AND EXISTS (
  SELECT 1 FROM `bookings`
  WHERE `status` = 'confirmed' AND `starts_at` < NEW.`ends_at` AND `ends_at` > NEW.`starts_at`
)
BEGIN
  SELECT RAISE(ABORT, 'booking_overlap');
END;
--> statement-breakpoint
CREATE TRIGGER `bookings_no_overlap_update`
BEFORE UPDATE OF `status`, `starts_at`, `ends_at` ON `bookings`
WHEN NEW.`status` = 'confirmed' AND EXISTS (
  SELECT 1 FROM `bookings`
  WHERE `id` <> NEW.`id` AND `status` = 'confirmed'
    AND `starts_at` < NEW.`ends_at` AND `ends_at` > NEW.`starts_at`
)
BEGIN
  SELECT RAISE(ABORT, 'booking_overlap');
END;
