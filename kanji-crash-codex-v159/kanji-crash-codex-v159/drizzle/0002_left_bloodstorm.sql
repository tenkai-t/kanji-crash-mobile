CREATE TABLE `online_queue` (
	`key` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`rating` integer NOT NULL,
	`joined_at` integer NOT NULL,
	`touched_at` integer NOT NULL,
	`room_code` text
);
--> statement-breakpoint
CREATE INDEX `idx_online_queue_waiting` ON `online_queue` (`room_code`,`touched_at`);--> statement-breakpoint
CREATE TABLE `online_results` (
	`code` text PRIMARY KEY NOT NULL,
	`host_key` text NOT NULL,
	`guest_key` text NOT NULL,
	`host_delta` integer NOT NULL,
	`guest_delta` integer NOT NULL,
	`winner` integer,
	`applied` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `online_stats` (
	`key` text PRIMARY KEY NOT NULL,
	`rating` integer DEFAULT 1200 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `mode` text DEFAULT 'friend' NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `deadline` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `grace_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `seen_host` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `seen_guest` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `reconnect_used` integer DEFAULT 0 NOT NULL;