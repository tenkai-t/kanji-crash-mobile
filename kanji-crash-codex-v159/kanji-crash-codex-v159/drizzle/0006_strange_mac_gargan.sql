CREATE TABLE `challenge_scores` (
	`key` text NOT NULL,
	`mode` text NOT NULL,
	`wins` integer NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`estimated` integer DEFAULT 0 NOT NULL,
	`profile` text NOT NULL,
	`team` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`key`, `mode`)
);
--> statement-breakpoint
CREATE INDEX `idx_challenge_scores_ranking` ON `challenge_scores` (`mode`,`wins`,`kills`,`updated_at`);