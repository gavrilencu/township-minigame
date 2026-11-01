import { handler, intParam } from "@/lib/server/http";
import { findPlayer, levelRanking } from "@/lib/server/players";

/** Scores of you and your friends on one level. */
export const GET = handler(async (req, ctx: RouteContext<"/api/levels/[level]">) => {
  const { level } = await ctx.params;
  const me = await findPlayer(new URL(req.url).searchParams.get("u"));
  return { ranking: await levelRanking(intParam(level, 1), me.id) };
});
