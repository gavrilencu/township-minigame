import type { BoosterId, InGameBooster, PreBooster } from "./game/economy";
import type { FinishResponse, FriendDTO, LevelResultDTO, LevelScoreRow, PlayerDTO, RankRow } from "./shared";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Nu există conexiune la internet", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Eroare neașteptată", res.status);
  return data as T;
}

const q = encodeURIComponent;

export const api = {
  session: (username: string, avatar?: string) =>
    req<{ player: PlayerDTO; created: boolean; results: LevelResultDTO[] }>("POST", "/api/session", { username, avatar }),
  player: (u: string) => req<{ player: PlayerDTO; results: LevelResultDTO[] }>("GET", `/api/player?u=${q(u)}`),
  setAvatar: (username: string, avatar: string) => req<{ player: PlayerDTO }>("PATCH", "/api/player", { username, avatar }),
  start: (username: string, level: number, boosters: PreBooster[]) =>
    req<{ player: PlayerDTO }>("POST", "/api/game/start", { username, level, boosters }),
  finish: (username: string, data: { level: number; won: boolean; score: number; movesLeft: number; continues: number }) =>
    req<FinishResponse>("POST", "/api/game/finish", { username, ...data }),
  continueGame: (username: string, nth: number) =>
    req<{ player: PlayerDTO; price: number }>("POST", "/api/game/continue", { username, nth }),
  useBooster: (username: string, booster: InGameBooster) =>
    req<{ player: PlayerDTO }>("POST", "/api/boosters/use", { username, booster }),
  buy: (username: string, item: BoosterId | string, qty = 1) =>
    req<{ player: PlayerDTO; price: number }>("POST", "/api/shop", { username, item, qty }),
  daily: (username: string) => req<{ player: PlayerDTO; reward: number; streak: number }>("POST", "/api/daily", { username }),
  friends: (u: string) => req<{ friends: FriendDTO[] }>("GET", `/api/friends?u=${q(u)}`),
  addFriend: (username: string, friend: string) => req<{ friends: FriendDTO[] }>("POST", "/api/friends", { username, friend }),
  removeFriend: (username: string, friend: string) =>
    req<{ friends: FriendDTO[] }>("DELETE", "/api/friends", { username, friend }),
  search: (u: string, query: string) =>
    req<{ players: (FriendDTO & { isFriend: boolean })[] }>("GET", `/api/search?u=${q(u)}&q=${q(query)}`),
  leaderboard: (u: string, scope: "friends" | "global") =>
    req<{ rows: RankRow[]; me: RankRow | null }>("GET", `/api/leaderboard?u=${q(u)}&scope=${scope}`),
  levelRanking: (u: string, level: number) => req<{ ranking: LevelScoreRow[] }>("GET", `/api/levels/${level}?u=${q(u)}`),
};
