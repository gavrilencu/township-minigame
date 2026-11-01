import type { Inventory } from "./game/economy";
import type { Reward } from "./game/economy";

export const AVATARS = ["🦊", "🐼", "🐱", "🐶", "🦁", "🐸", "🐵", "🦄", "🐯", "🐨", "🐰", "🐙", "🐧", "🦋", "🐲", "🦉"];

export interface PlayerDTO {
  username: string;
  avatar: string;
  coins: number;
  level: number;
  totalStars: number;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  boosters: Inventory;
  dailyAvailable: boolean;
  dailyStreak: number;
  /** streak day the next daily gift will count as (1..∞) */
  dailyNext: number;
  createdAt: string;
}

export interface LevelResultDTO {
  level: number;
  stars: number;
  score: number;
  fails: number;
}

export interface FriendDTO {
  username: string;
  avatar: string;
  level: number;
  totalStars: number;
  totalScore: number;
  lastSeen: string;
}

export interface RankRow extends FriendDTO {
  rank: number;
  isMe: boolean;
}

export interface LevelScoreRow {
  username: string;
  avatar: string;
  score: number;
  stars: number;
  isMe: boolean;
}

export interface FinishResponse {
  player: PlayerDTO;
  result: LevelResultDTO;
  reward: Reward | null;
  stars: number;
  newBest: boolean;
  ranking: LevelScoreRow[];
}

export const USERNAME_RULES = "3–16 caractere: litere, cifre, spațiu, punct, _ sau -";

export function normalizeUsername(raw: string): { display: string; key: string } | null {
  const display = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  if (display.length < 3 || display.length > 16) return null;
  if (!/^[\p{L}\p{N}_.\- ]+$/u.test(display)) return null;
  return { display, key: display.toLocaleLowerCase("ro") };
}

/** Moves added to a level after repeated failures, so nobody stays stuck forever. */
export function assistMoves(fails: number): number {
  return Math.min(Math.max(fails, 0), 4) * 2;
}
