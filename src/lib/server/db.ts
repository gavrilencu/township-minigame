import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const SCHEMA = /* sql */ `
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
`;

const g = globalThis as unknown as { __djPool?: Pool; __djSchema?: Promise<void> };

function pool(): Pool {
  if (!g.__djPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL lipsește din .env.local");
    g.__djPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return g.__djPool;
}

function ready(): Promise<void> {
  g.__djSchema ??= pool()
    .query(SCHEMA)
    .then(() => undefined)
    .catch((err) => {
      g.__djSchema = undefined;
      throw err;
    });
  return g.__djSchema;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
