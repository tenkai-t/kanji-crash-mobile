CREATE TABLE `cpu_skill_best` (
	`key` text NOT NULL,
	`challenge` text NOT NULL,
	`score` integer NOT NULL,
	`shots` integer NOT NULL,
	`survivors` integer NOT NULL,
	PRIMARY KEY(`key`, `challenge`)
);
--> statement-breakpoint
CREATE TABLE `cpu_skill_scores` (
	`key` text PRIMARY KEY NOT NULL,
	`score` integer NOT NULL,
	`cleared_stages` integer NOT NULL,
	`profile` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cpu_skill_scores_rank` ON `cpu_skill_scores` (`score`);