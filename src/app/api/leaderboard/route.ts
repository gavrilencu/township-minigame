import { query } from "@/lib/server/db";
import { handler } from "@/lib/server/http";
import { findPlayer, toFriend, type PlayerRow } from "@/lib/server/players";
import type { RankRow } from "@/lib/shared";

type Ranked = PlayerRow & { rank: string };

export const GET = handler(async (req) => {
  const params = new URL(req.url).searchParams;
  const me = await findPlayer(params.get("u"));
  const scope =
    params.get("scope") === "friends"
      ? `WHERE p.id = $1 OR p.id IN (SELECT friend_id FROM friendships WHERE player_id = $1)`
      : `WHERE $1::int IS NOT NULL`;
  const ranked = `SELECT p.*, RANK() OVER (ORDER BY p.level DESC, p.total_stars DESC, p.total_score DESC) AS rank
                    FROM players p ${scope}`;
  const top = await query<Ranked>(`SELECT * FROM (${ranked}) t ORDER BY rank, t.id LIMIT 50`, [me.id]);
  const mine = top.find((r) => r.id === me.id) ?? (await query<Ranked>(`SELECT * FROM (${ranked}) t WHERE t.id = $1`, [me.id]))[0];
  const toRow = (r: Ranked): RankRow => ({ ...toFriend(r), rank: Number(r.rank), isMe: r.id === me.id });
  return { rows: top.map(toRow), me: mine ? toRow(mine) : null };
});
