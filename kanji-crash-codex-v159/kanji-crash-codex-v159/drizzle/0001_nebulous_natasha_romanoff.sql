CREATE TABLE `friend_connections` (
	`left_key` text NOT NULL,
	`right_key` text NOT NULL,
	`requested_by` text NOT NULL,
	`status` text NOT NULL,
	`invite_code` text,
	`invited_by` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`left_key`, `right_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_friend_connections_right` ON `friend_connections` (`right_key`);--> statement-breakpoint
CREATE TABLE `friend_players` (
	`key` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_players_code_unique` ON `friend_players` (`code`);--> statement-breakpoint
CREATE TABLE `friend_setups` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `round` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `ready` text DEFAULT '[false,false]' NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `departed` integer DEFAULT 0 NOT NULL;