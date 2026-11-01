import { query } from "@/lib/server/db";
import { body, handler } from "@/lib/server/http";
import { findPlayer, friendsOf, HttpError } from "@/lib/server/players";

export const GET = handler(async (req) => {
  const me = await findPlayer(new URL(req.url).searchParams.get("u"));
  return { friends: await friendsOf(me.id) };
});

/** Friendship is mutual and instant: adding someone puts you on their list too. */
export const POST = handler(async (req) => {
  const b = await body<{ username?: string; friend?: string }>(req);
  const me = await findPlayer(b.username);
  const other = await findPlayer(b.friend).catch(() => {
    throw new HttpError(404, "Nu există niciun jucător cu acest nume");
  });
  if (other.id === me.id) throw new HttpError(400, "Nu te poți adăuga pe tine");
  await query(
    `INSERT INTO friendships (player_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING`,
    [me.id, other.id],
  );
  return { friends: await friendsOf(me.id) };
});

export const DELETE = handler(async (req) => {
  const b = await body<{ username?: string; friend?: string }>(req);
  const me = await findPlayer(b.username);
  const other = await findPlayer(b.friend);
  await query(
    `DELETE FROM friendships WHERE (player_id = $1 AND friend_id = $2) OR (player_id = $2 AND friend_id = $1)`,
    [me.id, other.id],
  );
  return { friends: await friendsOf(me.id) };
});
