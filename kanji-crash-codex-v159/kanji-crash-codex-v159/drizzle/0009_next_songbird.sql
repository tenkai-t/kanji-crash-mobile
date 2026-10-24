CREATE TABLE `battle_replays` (
	`key` text NOT NULL,
	`id` text NOT NULL,
	`created_at` integer NOT NULL,
	`summary` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`key`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_battle_replays_recent` ON `battle_replays` (`key`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `replay_log` text;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `replay_saved` integer DEFAULT 0 NOT NULL;