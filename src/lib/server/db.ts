import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

/** Tables the game needs. They are created by `npm run db:migrate` (db/schema.sql), never by the game itself. */
export const REQUIRED_TABLES = ["players", "level_results", "friendships"];

const g = globalThis as unknown as { __djPool?: Pool };

function pool(): Pool {
  if (!g.__djPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL lipsește din configurație");
    g.__djPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return g.__djPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Throws with a readable message unless the database is reachable and has every table the game needs. */
export async function checkDatabase(): Promise<void> {
  const rows = await query<{ name: string }>(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1)",
    [REQUIRED_TABLES],
  );
  const missing = REQUIRED_TABLES.filter((t) => !rows.some((r) => r.name === t));
  if (missing.length) {
    throw new Error(`Baza de date nu are tabelele jocului (lipsesc: ${missing.join(", ")}). Rulează: npm run db:migrate`);
  }
}
