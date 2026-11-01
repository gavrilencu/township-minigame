import { INGAME_BOOSTERS, type InGameBooster } from "@/lib/game/economy";
import { body, handler } from "@/lib/server/http";
import { HttpError, mutate, toDTO } from "@/lib/server/players";

export const POST = handler(async (req) => {
  const b = await body<{ username?: string; booster?: string }>(req);
  const id = b.booster as InGameBooster;
  if (!INGAME_BOOSTERS.includes(id)) throw new HttpError(400, "Ajutor necunoscut");
  const { row } = await mutate(b.username, (p) => {
    if (p.boosters[id]! < 1) throw new HttpError(409, "Nu mai ai acest ajutor");
    p.boosters[id]! -= 1;
  });
  return { player: toDTO(row) };
});
