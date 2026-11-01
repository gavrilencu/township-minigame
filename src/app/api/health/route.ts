import { connection } from "next/server";
import { checkDatabase } from "@/lib/server/db";

/** Used by the Docker healthcheck: 200 only when the database is reachable and has its tables. */
export async function GET() {
  await connection();
  try {
    await checkDatabase();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 503 });
  }
}
