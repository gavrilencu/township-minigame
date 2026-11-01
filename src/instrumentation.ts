/**
 * Runs once when the server starts: the game must not serve players without its database.
 * In production the process exits (Docker then restarts it); in development it only warns.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { checkDatabase } = await import("./lib/server/db");

  const attempts = 10;
  for (let i = 1; i <= attempts; i++) {
    try {
      await checkDatabase();
      console.log("✓ Baza de date e accesibilă și are tabelele jocului.");
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const missingTables = message.includes("tabelele jocului");
      if (!missingTables && i < attempts) {
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
