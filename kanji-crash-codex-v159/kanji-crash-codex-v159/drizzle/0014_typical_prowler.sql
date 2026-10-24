CREATE TABLE `deck_favorites` (
	`key` text NOT NULL,
	`slot` integer NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`key`, `slot`)
);
