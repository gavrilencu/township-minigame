import { body, handler } from "@/lib/server/http";
import { findPlayer, HttpError, mutate, resultsOf, toDTO } from "@/lib/server/players";
import { AVATARS } from "@/lib/shared";

export const GET = handler(async (req) => {
  const u = new URL(req.url).searchParams.get("u");
  const row = await findPlayer(u);
  return { player: toDTO(row), results: await resultsOf(row.id) };
});

export const PATCH = handler(async (req) => {
  const { username, avatar } = await body<{ username?: string; avatar?: string }>(req);
  if (!avatar || !AVATARS.includes(avatar)) throw new HttpError(400, "Avatar invalid");
  const { row } = await mutate(username, (p) => {
    p.avatar = avatar;
  });
  return { player: toDTO(row) };
});
