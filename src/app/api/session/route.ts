import { body, handler } from "@/lib/server/http";
import { getOrCreate, resultsOf, toDTO } from "@/lib/server/players";

/** Enter the game with a username: creates the player the first time, loads it afterwards. */
export const POST = handler(async (req) => {
  const { username, avatar } = await body<{ username?: string; avatar?: string }>(req);
  const { row, created } = await getOrCreate(username, avatar);
  return { player: toDTO(row), created, results: await resultsOf(row.id) };
});
