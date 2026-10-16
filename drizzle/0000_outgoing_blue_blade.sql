CREATE TABLE `oura_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`secret` text NOT NULL,
	`tokens` text,
	`expires` integer DEFAULT 0 NOT NULL,
	`refresh_lock` integer DEFAULT 0 NOT NULL,
	`cache` text,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`verifier` text NOT NULL,
	`expires` integer NOT NULL
);
