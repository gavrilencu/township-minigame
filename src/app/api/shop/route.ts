import { BOOSTER_IDS, BOOSTERS, BUNDLES, type BoosterId, type Inventory } from "@/lib/game/economy";
import { body, handler, intParam } from "@/lib/server/http";
import { HttpError, mutate, toDTO } from "@/lib/server/players";

export const POST = handler(async (req) => {
  const b = await body<{ username?: string; item?: string; qty?: number }>(req);
  const qty = Math.min(Math.max(intParam(b.qty, 1), 1), 10);
  let price: number;
  let items: Partial<Inventory>;
  const bundle = BUNDLES.find((x) => x.id === b.item);
  if (bundle) {
    price = bundle.price;
    items = bundle.items;
  } else if (BOOSTER_IDS.includes(b.item as BoosterId)) {
    const id = b.item as BoosterId;
    price = BOOSTERS[id].price * qty;
    items = { [id]: qty };
  } else {
    throw new HttpError(400, "Produs necunoscut");
  }
  const { row } = await mutate(b.username, (p) => {
    if (p.coins < price) throw new HttpError(409, "Nu ai destule monede");
    p.coins -= price;
    for (const [id, n] of Object.entries(items)) p.boosters[id as BoosterId] = (p.boosters[id as BoosterId] ?? 0) + (n ?? 0);
  });
  return { player: toDTO(row), price };
});
