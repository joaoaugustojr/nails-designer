-- Hand-written: SQLite cannot ADD a NOT NULL or REFERENCES column, so bookings is rebuilt.
-- Clients are created from existing bookings (one per phone, latest name wins) before linking.
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "clients_phone_digits" CHECK("clients"."phone" <> '' and "clients"."phone" not glob '*[^0-9]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_phone_unique` ON `clients` (`phone`);--> statement-breakpoint
INSERT INTO `clients` (`phone`, `name`, `created_at`, `updated_at`)
SELECT
	`b`.`client_phone`,
	(SELECT `latest`.`client_name` FROM `bookings` AS `latest` WHERE `latest`.`client_phone` = `b`.`client_phone` ORDER BY `latest`.`created_at` DESC, `latest`.`id` DESC LIMIT 1),
	MIN(`b`.`created_at`),
	MAX(`b`.`created_at`)
FROM `bookings` AS `b`
GROUP BY `b`.`client_phone`;--> statement-breakpoint
CREATE TABLE `__new_bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer,
	`client_id` integer NOT NULL,
	`service_name` text NOT NULL,
	`service_duration_minutes` integer NOT NULL,
	`service_price_cents` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`client_name` text NOT NULL,
	`client_phone` text NOT NULL,
	`client_email` text,
	`reminders_opt_in` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`cancelled_at` integer,
	`reminder_day_sent_at` integer,
	`reminder1h_sent_at` integer,
	`reminder30m_sent_at` integer,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "bookings_range" CHECK("__new_bookings"."starts_at" < "__new_bookings"."ends_at"),
	CONSTRAINT "bookings_status" CHECK("__new_bookings"."status" in ('confirmed', 'cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_bookings` (`id`, `service_id`, `client_id`, `service_name`, `service_duration_minutes`, `service_price_cents`, `starts_at`, `ends_at`, `client_name`, `client_phone`, `client_email`, `reminders_opt_in`, `status`, `token`, `created_at`, `cancelled_at`, `reminder_day_sent_at`, `reminder1h_sent_at`, `reminder30m_sent_at`)
SELECT `id`, `service_id`, (SELECT `clients`.`id` FROM `clients` WHERE `clients`.`phone` = `bookings`.`client_phone`), `service_name`, `service_duration_minutes`, `service_price_cents`, `starts_at`, `ends_at`, `client_name`, `client_phone`, `client_email`, `reminders_opt_in`, `status`, `token`, `created_at`, `cancelled_at`, `reminder_day_sent_at`, `reminder1h_sent_at`, `reminder30m_sent_at`
FROM `bookings`;--> statement-breakpoint
DROP TABLE `bookings`;--> statement-breakpoint
ALTER TABLE `__new_bookings` RENAME TO `bookings`;--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_unique` ON `bookings` (`token`);--> statement-breakpoint
CREATE INDEX `bookings_starts_idx` ON `bookings` (`starts_at`);--> statement-breakpoint
CREATE INDEX `bookings_client_idx` ON `bookings` (`client_id`);
