import { PRE_BOOSTERS, type PreBooster } from "@/lib/game/economy";
import { body, handler, intParam } from "@/lib/server/http";
import { HttpError, mutate, toDTO } from "@/lib/server/players";

/** Starting a level spends the selected start-boosters. */
export const POST = handler(async (req) => {
  const b = await body<{ username?: string; level?: number; boosters?: string[] }>(req);
  const level = intParam(b.level);
  const chosen = [...new Set(b.boosters ?? [])].filter((x): x is PreBooster => PRE_BOOSTERS.includes(x as PreBooster));
  const { row } = await mutate(b.username, (p) => {
    if (level < 1 || level > p.level) throw new HttpError(403, "Nivelul nu este deblocat încă");
    for (const id of chosen) {
      if (p.boosters[id]! < 1) throw new HttpError(409, "Nu ai destule ajutoare");
      p.boosters[id]! -= 1;
    }
  });
  return { player: toDTO(row), boosters: chosen };
});
