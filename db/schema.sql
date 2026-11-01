-- Djesi Jewels database schema.
-- Applied explicitly with `npm run db:migrate` (or `docker compose run --rm app node scripts/migrate.mjs`);
-- the game never creates tables on its own. Safe to run again: every statement is idempotent.

CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL,
  username_key  TEXT NOT NULL UNIQUE,
  avatar        TEXT NOT NULL,
  coins         INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  total_stars   INTEGER NOT NULL DEFAULT 0,
  total_score   BIGINT  NOT NULL DEFAULT 0,
  games_played  INTEGER NOT NULL DEFAULT 0,
  games_won     INTEGER NOT NULL DEFAULT 0,
  boosters      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  daily_last    TEXT,
  daily_streak  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS players_rank_idx ON players (level DESC, total_stars DESC, total_score DESC);

CREATE TABLE IF NOT EXISTS level_results (
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  level       INTEGER NOT NULL,
  best_score  INTEGER NOT NULL DEFAULT 0,
  stars       SMALLINT NOT NULL DEFAULT 0,
  wins        INTEGER NOT NULL DEFAULT 0,
  fails       INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, level)
);
CREATE INDEX IF NOT EXISTS level_results_level_idx ON level_results (level, best_score DESC);

CREATE TABLE IF NOT EXISTS friendships (
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  friend_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, friend_id),
  CHECK (player_id <> friend_id)
);
