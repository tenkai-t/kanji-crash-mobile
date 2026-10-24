ALTER TABLE `battle_replays` ADD `favorite` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_battle_replays_favorites` ON `battle_replays` (`key`,`favorite`,`created_at`,`id`);