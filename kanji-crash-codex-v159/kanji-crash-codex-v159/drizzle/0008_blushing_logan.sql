CREATE TABLE `play_events` (
	`key` text NOT NULL,
	`event` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`key`, `event`)
);
--> statement-breakpoint
CREATE TABLE `play_usage` (
	`key` text NOT NULL,
	`char` text NOT NULL,
	`plays` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`shots` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`survived` integer DEFAULT 0 NOT NULL,
	`best_shot` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`key`, `char`)
);
--> statement-breakpoint
CREATE TABLE `practice_records` (
	`key` text NOT NULL,
	`challenge` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`clears` integer DEFAULT 0 NOT NULL,
	`best_shots` integer,
	`best_survivors` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`key`, `challenge`)
);
