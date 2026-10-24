ALTER TABLE `cpu_season_best` ADD `kill_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cpu_season_scores` ADD `kill_total` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE cpu_season_best SET score=(1000+survivors*100+MAX(0,300-(shots-1)*20))*1000,kill_total=shots*3;
--> statement-breakpoint
UPDATE cpu_season_scores SET score=(SELECT SUM(b.score) FROM cpu_season_best b WHERE b.key=cpu_season_scores.key AND b.season=cpu_season_scores.season),kill_total=(SELECT SUM(b.kill_total) FROM cpu_season_best b WHERE b.key=cpu_season_scores.key AND b.season=cpu_season_scores.season);
--> statement-breakpoint
DELETE FROM leaderboard_snapshots WHERE rule LIKE 'cpu-skill:%';
