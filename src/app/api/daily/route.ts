import { dailyReward } from "@/lib/game/economy";
import { body, handler } from "@/lib/server/http";
import { HttpError, mutate, toDTO, today, yesterday } from "@/lib/server/players";

/** Daily gift: the streak grows on consecutive days and resets after a missed day. */
export const POST = handler(async (req) => {
  const b = await body<{ username?: string }>(req);
  const { row, out } = await mutate(b.username, (p) => {
    if (p.daily_last === today()) throw new HttpError(409, "Ai luat deja cadoul de azi");
    p.daily_streak = p.daily_last === yesterday() ? p.daily_streak + 1 : 1;
    p.daily_last = today();
    const reward = dailyReward(p.daily_streak);
    p.coins += reward;
    return reward;
  });
  return { player: toDTO(row), reward: out, streak: row.daily_streak };
});
