import { query } from "@/lib/server/db";
import { handler } from "@/lib/server/http";
import { findPlayer, toFriend, type PlayerRow } from "@/lib/server/players";

export const GET = handler(async (req) => {
  const params = new URL(req.url).searchParams;
  const me = await findPlayer(params.get("u"));
  const q = (params.get("q") ?? "").normalize("NFC").trim().toLocaleLowerCase("ro").slice(0, 16);
  if (q.length < 1) return { players: [] };
  const like = q.replace(/[\\%_]/g, (m) => "\\" + m);
  const rows = await query<PlayerRow & { is_friend: boolean }>(
    `SELECT p.*, EXISTS (SELECT 1 FROM friendships f WHERE f.player_id = $2 AND f.friend_id = p.id) AS is_friend
       FROM players p
      WHERE p.username_key LIKE '%' || $1 || '%' AND p.id <> $2
      ORDER BY (p.username_key LIKE $1 || '%') DESC, p.level DESC
      LIMIT 15`,
    [like, me.id],
  );
  return { players: rows.map((r) => ({ ...toFriend(r), isFriend: r.is_friend })) };
});
