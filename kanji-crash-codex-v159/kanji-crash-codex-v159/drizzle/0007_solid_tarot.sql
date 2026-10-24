CREATE TABLE `leaderboard_snapshots` (
	`rule` text PRIMARY KEY NOT NULL,
	`payload` text,
	`generated_at` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_online_queue_rating` ON `online_queue` (`rule_set`,`room_code`,`rating`,`joined_at`,`key`);