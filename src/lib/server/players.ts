import "server-only";
import type { PoolClient } from "pg";
import { query, tx } from "./db";
import { BOOSTER_IDS, START_COINS, START_INVENTORY, type Inventory } from "../game/economy";
import { AVATARS, normalizeUsername, type FriendDTO, type LevelResultDTO, type LevelScoreRow, type PlayerDTO } from "../shared";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface PlayerRow {
  id: number;
  username: string;
  username_key: string;
  avatar: string;
  coins: number;
  level: number;
  total_stars: number;
  total_score: number;
  games_played: number;
  games_won: number;
  boosters: Partial<Inventory>;
  daily_last: string | null;
  daily_streak: number;
  created_at: Date;
  last_seen: Date;
}

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Chisinau",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const today = () => dayFmt.format(new Date());
export const yesterday = () => dayFmt.format(new Date(Date.now() - 86_400_000));

export function inventory(raw: Partial<Inventory> | null | undefined): Inventory {
  const inv = {} as Inventory;
  for (const id of BOOSTER_IDS) inv[id] = Math.max(0, Math.floor(Number(raw?.[id] ?? 0)) || 0);
  return inv;
}

function normalizeRow(row: PlayerRow): PlayerRow {
  return { ...row, total_score: Number(row.total_score), boosters: inventory(row.boosters) };
}

export function toDTO(row: PlayerRow): PlayerDTO {
  return {
    username: row.username,
    avatar: row.avatar,
    coins: row.coins,
    level: row.level,
    totalStars: row.total_stars,
    totalScore: Number(row.total_score),
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    boosters: inventory(row.boosters),
    dailyAvailable: row.daily_last !== today(),
    dailyStreak: row.daily_streak,
    dailyNext: row.daily_last === today() ? row.daily_streak : row.daily_last === yesterday() ? row.daily_streak + 1 : 1,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function toFriend(row: PlayerRow): FriendDTO {
  return {
    username: row.username,
    avatar: row.avatar,
    level: row.level,
    totalStars: row.total_stars,
    totalScore: Number(row.total_score),
    lastSeen: new Date(row.last_seen).toISOString(),
  };
}

export function keyOf(username: unknown): string {
  const n = typeof username === "string" ? normalizeUsername(username) : null;
  if (!n) throw new HttpError(400, "Nume de utilizator invalid");
  return n.key;
}

export async function findPlayer(username: unknown): Promise<PlayerRow> {
  const rows = await query<PlayerRow>("SELECT * FROM players WHERE username_key = $1", [keyOf(username)]);
  if (!rows[0]) throw new HttpError(404, "Jucătorul nu există");
  return normalizeRow(rows[0]);
}

export async function getOrCreate(username: unknown, avatar: unknown): Promise<{ row: PlayerRow; created: boolean }> {
  const n = typeof username === "string" ? normalizeUsername(username) : null;
  if (!n) throw new HttpError(400, "Nume de utilizator invalid");
  const av = typeof avatar === "string" && AVATARS.includes(avatar) ? avatar : AVATARS[n.key.length % AVATARS.length];
  const rows = await query<PlayerRow & { created: boolean }>(
    `INSERT INTO players (username, username_key, avatar, coins, boosters)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (username_key) DO UPDATE SET last_seen = now()
     RETURNING *, (xmax = 0) AS created`,
    [n.display, n.key, av, START_COINS, JSON.stringify(START_INVENTORY)],
  );
  const { created, ...row } = rows[0];
  return { row: normalizeRow(row), created };
}

/** Locks the player row, lets `fn` change it, then saves it. */
export async function mutate<T>(
  username: unknown,
  fn: (row: PlayerRow, client: PoolClient) => Promise<T> | T,
): Promise<{ row: PlayerRow; out: T }> {
  const key = keyOf(username);
  return tx(async (client) => {
    const found = await client.query<PlayerRow>("SELECT * FROM players WHERE username_key = $1 FOR UPDATE", [key]);
    if (!found.rows[0]) throw new HttpError(404, "Jucătorul nu există");
    const row = normalizeRow(found.rows[0]);
    const out = await fn(row, client);
    const saved = await client.query<PlayerRow>(
      `UPDATE players SET avatar = $2, coins = $3, level = $4, total_stars = $5, total_score = $6,
         games_played = $7, games_won = $8, boosters = $9, daily_last = $10, daily_streak = $11, last_seen = now()
       WHERE id = $1 RETURNING *`,
      [
        row.id,
        row.avatar,
        row.coins,
        row.level,
        row.total_stars,
        row.total_score,
        row.games_played,
        row.games_won,
        JSON.stringify(inventory(row.boosters)),
        row.daily_last,
        row.daily_streak,
      ],
    );
    return { row: normalizeRow(saved.rows[0]), out };
  });
}

export async function resultsOf(playerId: number): Promise<LevelResultDTO[]> {
  const rows = await query<{ level: number; stars: number; best_score: number; fails: number }>(
    "SELECT level, stars, best_score, fails FROM level_results WHERE player_id = $1 ORDER BY level",
    [playerId],
  );
  return rows.map((r) => ({ level: r.level, stars: r.stars, score: r.best_score, fails: r.fails }));
}

export async function levelRanking(level: number, playerId: number): Promise<LevelScoreRow[]> {
  const rows = await query<{ username: string; avatar: string; best_score: number; stars: number; is_me: boolean }>(
    `SELECT p.username, p.avatar, lr.best_score, lr.stars, (p.id = $2) AS is_me
       FROM level_results lr JOIN players p ON p.id = lr.player_id
      WHERE lr.level = $1 AND lr.stars > 0
        AND (lr.player_id = $2 OR lr.player_id IN (SELECT friend_id FROM friendships WHERE player_id = $2))
      ORDER BY lr.best_score DESC
      LIMIT 20`,
    [level, playerId],
  );
  return rows.map((r) => ({ username: r.username, avatar: r.avatar, score: r.best_score, stars: r.stars, isMe: r.is_me }));
}

export async function friendsOf(playerId: number): Promise<FriendDTO[]> {
  const rows = await query<PlayerRow>(
    `SELECT p.* FROM friendships f JOIN players p ON p.id = f.friend_id
      WHERE f.player_id = $1
      ORDER BY p.level DESC, p.total_stars DESC, p.total_score DESC`,
    [playerId],
  );
  return rows.map(toFriend);
}
