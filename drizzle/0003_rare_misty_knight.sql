CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `thread_user_time_idx` ON `chat_threads` (`user_id`,`updated_at`);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `thread_id` text;