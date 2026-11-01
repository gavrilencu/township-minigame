import { continuePrice } from "@/lib/game/economy";
import { body, handler, intParam } from "@/lib/server/http";
import { HttpError, mutate, toDTO } from "@/lib/server/players";

/** Buy extra moves after running out. Price grows with each continue in the same attempt. */
export const POST = handler(async (req) => {
  const b = await body<{ username?: string; nth?: number }>(req);
  const price = continuePrice(intParam(b.nth));
  const { row } = await mutate(b.username, (p) => {
    if (p.coins < price) throw new HttpError(409, "Nu ai destule monede");
    p.coins -= price;
  });
  return { player: toDTO(row), price };
});
