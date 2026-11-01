// Creates the game's tables from db/schema.sql. The database itself must already exist.
// Usage: npm run db:migrate   (reads DATABASE_URL from the environment or from .env.local)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nu este setat (în mediu, .env.local sau .env).");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(readFileSync(join(root, "db", "schema.sql"), "utf8"));
  const { rows } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('players', 'level_results', 'friendships') ORDER BY 1",
  );
  console.log(`Gata. Tabele prezente: ${rows.map((r) => r.table_name).join(", ")}`);
} catch (err) {
  console.error(`Migrarea a eșuat: ${err.message}`);
  if (err.code === "3D000") console.error("Baza de date din DATABASE_URL nu există. Creeaz-o întâi (de ex. CREATE DATABASE ...).");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
