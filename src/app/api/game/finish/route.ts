import { computeStars, levelReward, MAX_SCORE, type Reward } from "@/lib/game/economy";
import { generateLevel } from "@/lib/game/levels";
import { body, handler, intParam } from "@/lib/server/http";
import { HttpError, levelRanking, mutate, toDTO } from "@/lib/server/players";
import { assistMoves, type FinishResponse, type LevelResultDTO } from "@/lib/shared";

interface Prev {
  best_score: number;
  stars: number;
  fails: number;
}

export const POST = handler(async (req): Promise<FinishResponse> => {
  const b = await body<{
    username?: string;
    level?: number;
    won?: boolean;
    score?: number;
    movesLeft?: number;
    continues?: number;
  }>(req);
  const level = intParam(b.level);
  const won = b.won === true;
  const cfg = generateLevel(Math.max(1, level));

  const { row, out } = await mutate(b.username, async (p, client) => {
    if (level < 1 || level > p.level) throw new HttpError(403, "Nivelul nu este deblocat încă");
    const prevRes = await client.query<Prev>(
      "SELECT best_score, stars, fails FROM level_results WHERE player_id = $1 AND level = $2 FOR UPDATE",
      [p.id, level],
    );
    const prev: Prev = prevRes.rows[0] ?? { best_score: 0, stars: 0, fails: 0 };
    p.games_played += 1;

    if (!won) {
      await client.query(
        `INSERT INTO level_results (player_id, level, fails) VALUES ($1, $2, 1)
         ON CONFLICT (player_id, level) DO UPDATE SET fails = level_results.fails + 1, updated_at = now()`,
        [p.id, level],
      );
      const result: LevelResultDTO = { level, stars: prev.stars, score: prev.best_score, fails: prev.fails + 1 };
      return { result, reward: null as Reward | null, stars: 0, newBest: false };
    }

    const maxMoves = cfg.moves + assistMoves(prev.fails) + 5 * Math.min(Math.max(intParam(b.continues), 0), 10);
    const movesLeft = Math.min(Math.max(intParam(b.movesLeft), 0), maxMoves);
    const score = Math.min(Math.max(intParam(b.score), 0), MAX_SCORE);
    const stars = computeStars(movesLeft, cfg.moves);
    const firstClear = prev.stars === 0;
    const reward = levelReward({ level, stars, movesLeft, firstClear, difficulty: cfg.difficulty });

    p.coins += reward.total;
    p.games_won += 1;
    p.level = Math.max(p.level, level + 1);
    p.total_stars += Math.max(0, stars - prev.stars);
    p.total_score += Math.max(0, score - prev.best_score);
    await client.query(
      `INSERT INTO level_results (player_id, level, best_score, stars, wins) VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT (player_id, level) DO UPDATE SET
         best_score = GREATEST(level_results.best_score, EXCLUDED.best_score),
         stars = GREATEST(level_results.stars, EXCLUDED.stars),
         wins = level_results.wins + 1,
         updated_at = now()`,
      [p.id, level, score, stars],
    );
    const result: LevelResultDTO = {
      level,
      stars: Math.max(stars, prev.stars),
      score: Math.max(score, prev.best_score),
      fails: prev.fails,
    };
    return { result, reward, stars, newBest: score > prev.best_score };
  });

  return { player: toDTO(row), ...out, ranking: await levelRanking(level, row.id) };
});
