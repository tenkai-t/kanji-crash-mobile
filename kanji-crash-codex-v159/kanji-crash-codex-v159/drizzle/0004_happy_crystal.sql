CREATE TABLE `cpu_scores` (
	`key` text PRIMARY KEY NOT NULL,
	`rating` integer NOT NULL,
	`profile` text NOT NULL,
	`team` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cpu_scores_rating` ON `cpu_scores` (`rating`);--> statement-breakpoint
ALTER TABLE `online_stats` ADD `profile` text;--> statement-breakpoint
ALTER TABLE `online_stats` ADD `team` text;--> statement-breakpoint
CREATE INDEX `idx_online_stats_rating` ON `online_stats` (`rating`);