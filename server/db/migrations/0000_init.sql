CREATE TABLE `bookings` (
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
	`idempotency_key` text,
	`created_at` integer NOT NULL,
	`cancelled_at` integer,
	`reminder_day_sent_at` integer,
	`reminder1h_sent_at` integer,
	`reminder30m_sent_at` integer,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "bookings_range" CHECK("bookings"."starts_at" < "bookings"."ends_at"),
	CONSTRAINT "bookings_status" CHECK("bookings"."status" in ('confirmed', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_unique` ON `bookings` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_idempotencyKey_unique` ON `bookings` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `bookings_starts_idx` ON `bookings` (`starts_at`);--> statement-breakpoint
CREATE INDEX `bookings_client_idx` ON `bookings` (`client_id`);--> statement-breakpoint
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
CREATE TABLE `service_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`path` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `service_photos_service_idx` ON `service_photos` (`service_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`includes` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "services_price_positive" CHECK("services"."price_cents" >= 0),
	CONSTRAINT "services_duration_positive" CHECK("services"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`store_name` text DEFAULT '' NOT NULL,
	`logo_path` text,
	`cover_path` text,
	`accent_color` text DEFAULT '#a8325a' NOT NULL,
	`address` text,
	`whatsapp` text,
	`instagram` text,
	`about` text,
	`thank_you_message` text,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`slot_step_minutes` integer DEFAULT 30 NOT NULL,
	`gap_minutes` integer DEFAULT 0 NOT NULL,
	`min_notice_minutes` integer DEFAULT 120 NOT NULL,
	`max_days_ahead` integer DEFAULT 30 NOT NULL,
	`client_can_cancel` integer DEFAULT false NOT NULL,
	`cancel_deadline_minutes` integer DEFAULT 120 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `time_off` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`reason` text,
	CONSTRAINT "time_off_range" CHECK("time_off"."starts_at" < "time_off"."ends_at")
);
--> statement-breakpoint
CREATE INDEX `time_off_starts_idx` ON `time_off` (`starts_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`session_version` integer DEFAULT 0 NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "users_email_lowercase" CHECK("users"."email" = lower("users"."email")),
	CONSTRAINT "users_role" CHECK("users"."role" in ('owner', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_single_owner` ON `users` (`role`) WHERE "users"."role" = 'owner';--> statement-breakpoint
CREATE TABLE `working_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`weekday` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	CONSTRAINT "working_hours_weekday" CHECK("working_hours"."weekday" between 0 and 6),
	CONSTRAINT "working_hours_range" CHECK("working_hours"."start_minute" >= 0 and "working_hours"."start_minute" < "working_hours"."end_minute" and "working_hours"."end_minute" <= 1440)
);
--> statement-breakpoint
CREATE INDEX `working_hours_weekday_idx` ON `working_hours` (`weekday`);