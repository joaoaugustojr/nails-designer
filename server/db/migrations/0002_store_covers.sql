ALTER TABLE `settings` ADD `cover_paths` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `settings` SET `cover_paths` = json_array(`cover_path`) WHERE `cover_path` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `cover_path`;
