import "server-only";
import { unstable_rethrow } from "next/navigation";
import { HttpError } from "./players";

const DB_DOWN = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "57P03", "3D000", "28P01"]);

export function handler<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return Response.json(await fn(req, ctx));
    } catch (err) {
      // Let Next.js internals (e.g. prerender bail-out on request.url) pass through untouched.
      unstable_rethrow(err);
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      const code = (err as { code?: string }).code;
      const dbDown = (code && DB_DOWN.has(code)) || String(err).includes("DATABASE_URL");
      return Response.json(
        { error: dbDown ? "Serverul de date nu răspunde. Încearcă din nou." : "Ceva n-a mers bine pe server." },
        { status: dbDown ? 503 : 500 },
      );
    }
  };
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Cerere invalidă");
  }
}

export function intParam(v: unknown, fallback = 0): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
}
