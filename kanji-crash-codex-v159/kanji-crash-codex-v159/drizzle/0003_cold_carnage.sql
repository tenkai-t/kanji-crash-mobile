DROP INDEX `idx_online_queue_waiting`;--> statement-breakpoint
ALTER TABLE `online_queue` ADD `rule_set` text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_online_queue_waiting` ON `online_queue` (`rule_set`,`room_code`,`touched_at`);--> statement-breakpoint
ALTER TABLE `friend_rooms` ADD `rule_set` text DEFAULT 'legacy' NOT NULL;