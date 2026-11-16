-- Hand-edited: drizzle-kit copied a "role" column the old table does not have.
-- The oldest existing user becomes the owner; everyone else is an admin.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "users_email_lowercase" CHECK("__new_users"."email" = lower("__new_users"."email")),
	CONSTRAINT "users_role" CHECK("__new_users"."role" in ('owner', 'admin'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "password_hash", "role", "created_at") SELECT "id", "name", "email", "password_hash", CASE WHEN "id" = (SELECT min("id") FROM `users`) THEN 'owner' ELSE 'admin' END, "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_single_owner` ON `users` (`role`) WHERE "users"."role" = 'owner';