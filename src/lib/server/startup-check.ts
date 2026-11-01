import { checkDatabase } from "./db";

const REASONS: Record<string, string> = {
  ECONNREFUSED: "conexiunea a fost refuzată (serverul Postgres nu ascultă la adresa din DATABASE_URL)",
  ENOTFOUND: "serverul din DATABASE_URL nu a fost găsit",
  ETIMEDOUT: "serverul Postgres nu răspunde",
  "28P01": "utilizator sau parolă greșită",
  "3D000": "baza de date din DATABASE_URL nu există — creeaz-o întâi",
};

function describe(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code && REASONS[code]) return REASONS[code];
  return (err instanceof Error && err.message) || code || String(err);
}

/**
 * The game must not serve players without its database.
 * In production the process exits (Docker then restarts it); in development it only warns.
 */
export async function checkOnStartup() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const attempts = 10;
  for (let i = 1; i <= attempts; i++) {
    try {
      await checkDatabase();
      console.log("✓ Baza de date e accesibilă și are tabelele jocului.");
      return;
    } catch (err) {
      const message = describe(err);
      if (!message.includes("tabelele jocului") && i < attempts) {
        console.warn(`Baza de date nu răspunde (${i}/${attempts}): ${message}. Reîncerc în 3s…`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      console.error(`✗ Jocul nu poate porni: ${message}`);
      if (process.env.NODE_ENV === "production") process.exit(1);
      return;
    }
  }
}
