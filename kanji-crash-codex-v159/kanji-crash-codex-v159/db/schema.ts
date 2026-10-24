import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('player_profiles', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const rooms = sqliteTable('friend_rooms', {
  code: text('code').primaryKey(),
  hostKey: text('host_key').notNull(),
  guestKey: text('guest_key'),
  host: text('host').notNull(),
  guest: text('guest'),
  state: text('state'),
  status: text('status').notNull(),
  revision: integer('revision').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
  round: integer('round').notNull().default(1),
  ready: text('ready').notNull().default('[false,false]'),
  departed: integer('departed').notNull().default(0),
  mode: text('mode').notNull().default('friend'),
  ruleSet: text('rule_set').notNull().default('legacy'),
  lineupRevision: integer('lineup_revision').notNull().default(0),
  deadline: integer('deadline').notNull().default(0),
  graceUntil: integer('grace_until').notNull().default(0),
  seenHost: integer('seen_host').notNull().default(0),
  seenGuest: integer('seen_guest').notNull().default(0),
  reconnectUsed: integer('reconnect_used').notNull().default(0),
  replayLog: text('replay_log'),
  replaySaved: integer('replay_saved').notNull().default(0),
},t=>[index('idx_rooms_host_recent').on(t.hostKey,t.mode,t.expiresAt),index('idx_rooms_guest_recent').on(t.guestKey,t.mode,t.expiresAt)]);
export const friendPlayers = sqliteTable('friend_players', {
  key: text('key').primaryKey(),
  code: text('code').notNull().unique(),
});
export const friendConnections = sqliteTable('friend_connections', {
  leftKey: text('left_key').notNull(),
  rightKey: text('right_key').notNull(),
  requestedBy: text('requested_by').notNull(),
  status: text('status').notNull(),
  inviteCode: text('invite_code'),
  invitedBy: text('invited_by'),
  updatedAt: integer('updated_at').notNull(),
}, table => [primaryKey({columns:[table.leftKey,table.rightKey]}), index('idx_friend_connections_right').on(table.rightKey)]);
export const friendSetups = sqliteTable('friend_setups', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
});
export const onlineQueue = sqliteTable('online_queue', {
  key: text('key').primaryKey(),
  player: text('player').notNull(),
  rating: integer('rating').notNull(),
  joinedAt: integer('joined_at').notNull(),
  touchedAt: integer('touched_at').notNull(),
  roomCode: text('room_code'),
  ruleSet: text('rule_set').notNull().default('balanced'),
}, table => [index('idx_online_queue_waiting').on(table.ruleSet,table.roomCode,table.touchedAt), index('idx_online_queue_rating').on(table.ruleSet,table.roomCode,table.rating,table.joinedAt,table.key)]);
export const onlineStats = sqliteTable('online_stats', {
  key: text('key').primaryKey(),
  rating: integer('rating').notNull().default(1200),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  profile: text('profile'),
  team: text('team'),
}, table => [index('idx_online_stats_rating').on(table.rating)]);
export const cpuScores = sqliteTable('cpu_scores', {
  key: text('key').primaryKey(),
  rating: integer('rating').notNull(),
  profile: text('profile').notNull(),
  team: text('team').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [index('idx_cpu_scores_rating').on(table.rating)]);
export const onlineResults = sqliteTable('online_results', {
  code: text('code').primaryKey(),
  hostKey: text('host_key').notNull(),
  guestKey: text('guest_key').notNull(),
  hostDelta: integer('host_delta').notNull(),
  guestDelta: integer('guest_delta').notNull(),
  winner: integer('winner'),
  applied: integer('applied').notNull().default(0),
});
export const challengeScores = sqliteTable('challenge_scores', {
  key: text('key').notNull(),
  mode: text('mode').notNull(),
  wins: integer('wins').notNull(),
  kills: integer('kills').notNull().default(0),
  estimated: integer('estimated').notNull().default(0),
  profile: text('profile').notNull(),
  team: text('team'),
  updatedAt: integer('updated_at').notNull(),
}, table => [primaryKey({columns:[table.key,table.mode]}), index('idx_challenge_scores_ranking').on(table.mode,table.wins,table.kills,table.updatedAt)]);
export const leaderboardSnapshots = sqliteTable('leaderboard_snapshots', {
  rule: text('rule').primaryKey(),
  payload: text('payload'),
  generatedAt: integer('generated_at').notNull().default(0),
  leaseUntil: integer('lease_until').notNull().default(0),
});
export const playUsage = sqliteTable('play_usage', {
  key: text('key').notNull(), char: text('char').notNull(),
  plays: integer('plays').notNull().default(0), wins: integer('wins').notNull().default(0),
  honorWins: integer('honor_wins').notNull().default(0),
  shots: integer('shots').notNull().default(0), kills: integer('kills').notNull().default(0),
  survived: integer('survived').notNull().default(0), bestShot: integer('best_shot').notNull().default(0),
}, table => [primaryKey({columns:[table.key,table.char]})]);
export const practiceRecords = sqliteTable('practice_records', {
  key: text('key').notNull(), challenge: text('challenge').notNull(),
  attempts: integer('attempts').notNull().default(0), clears: integer('clears').notNull().default(0),
  bestShots: integer('best_shots'), bestSurvivors: integer('best_survivors').notNull().default(0),
}, table => [primaryKey({columns:[table.key,table.challenge]})]);
export const playEvents = sqliteTable('play_events', {
  key: text('key').notNull(), event: text('event').notNull(), createdAt: integer('created_at').notNull(),
}, table => [primaryKey({columns:[table.key,table.event]})]);
export const battleReplays = sqliteTable('battle_replays', {
  key: text('key').notNull(), id: text('id').notNull(), createdAt: integer('created_at').notNull(),
  summary: text('summary').notNull(), payload: text('payload').notNull(), favorite: integer('favorite').notNull().default(0),
}, table => [primaryKey({columns:[table.key,table.id]}), index('idx_battle_replays_recent').on(table.key,table.createdAt,table.id), index('idx_battle_replays_favorites').on(table.key,table.favorite,table.createdAt,table.id)]);

export const cpuSkillBest = sqliteTable('cpu_skill_best', {key:text('key').notNull(),challenge:text('challenge').notNull(),score:integer('score').notNull(),shots:integer('shots').notNull(),survivors:integer('survivors').notNull()},t=>[primaryKey({columns:[t.key,t.challenge]})]);
export const cpuSkillScores = sqliteTable('cpu_skill_scores', {key:text('key').primaryKey(),score:integer('score').notNull(),clearedStages:integer('cleared_stages').notNull(),profile:text('profile').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('cpu_skill_scores_rank').on(t.score)]);

export const cpuSeasonBest = sqliteTable('cpu_season_best', {killTotal:integer('kill_total').notNull().default(0),key:text('key').notNull(),season:text('season').notNull(),challenge:text('challenge').notNull(),score:integer('score').notNull(),shots:integer('shots').notNull(),survivors:integer('survivors').notNull(),power:integer('power').notNull()},t=>[primaryKey({columns:[t.key,t.season,t.challenge]})]);
export const cpuSeasonScores = sqliteTable('cpu_season_scores', {killTotal:integer('kill_total').notNull().default(0),key:text('key').notNull(),season:text('season').notNull(),score:integer('score').notNull(),clearedStages:integer('cleared_stages').notNull(),survivors:integer('survivors').notNull(),shots:integer('shots').notNull(),power:integer('power').notNull(),profile:text('profile').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.key,t.season]}),index('cpu_season_scores_rank').on(t.season,t.score)]);

export const deckFavorites = sqliteTable('deck_favorites',{key:text('key').notNull(),slot:integer('slot').notNull(),payload:text('payload').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.key,t.slot]})]);
