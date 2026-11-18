CREATE TABLE `waitlist_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer,
	`service_name` text NOT NULL,
	`client_name` text NOT NULL,
	`client_phone` text NOT NULL,
	`dates` text NOT NULL,
	`periods` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`last_date` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `waitlist_requests_last_date_idx` ON `waitlist_requests` (`last_date`);--> statement-breakpoint
ALTER TABLE `settings` ADD `is_waitlist_enabled` integer DEFAULT true NOT NULL;