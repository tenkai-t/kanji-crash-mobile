CREATE TABLE `cpu_season_best` (
	`key` text NOT NULL,
	`season` text NOT NULL,
	`challenge` text NOT NULL,
	`score` integer NOT NULL,
	`shots` integer NOT NULL,
	`survivors` integer NOT NULL,
	`power` integer NOT NULL,
	PRIMARY KEY(`key`, `season`, `challenge`)
);
--> statement-breakpoint
CREATE TABLE `cpu_season_scores` (
	`key` text NOT NULL,
	`season` text NOT NULL,
	`score` integer NOT NULL,
	`cleared_stages` integer NOT NULL,
	`survivors` integer NOT NULL,
	`shots` integer NOT NULL,
	`power` integer NOT NULL,
	`profile` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`key`, `season`)
);
--> statement-breakpoint
CREATE INDEX `cpu_season_scores_rank` ON `cpu_season_scores` (`season`,`score`);