CREATE INDEX `chat_user_time_idx` ON `chat_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `health_user_day_idx` ON `health_records` (`user_id`,`record_day`);--> statement-breakpoint
CREATE INDEX `journal_user_time_idx` ON `journal_entries` (`user_id`,`created_at`);