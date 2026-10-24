UPDATE cpu_season_best SET score=(1000 + survivors*100 + MAX(0,100-shots*5))*1000 + CAST(ROUND(MAX(0,MIN(4000,4000-4.0*power/MAX(1,shots)))) AS INTEGER) WHERE score>=1000000000;
--> statement-breakpoint
UPDATE cpu_season_scores SET score=(SELECT SUM(b.score) FROM cpu_season_best b WHERE b.key=cpu_season_scores.key AND b.season=cpu_season_scores.season);
