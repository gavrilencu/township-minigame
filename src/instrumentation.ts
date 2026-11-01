/** Runs once when the server starts: refuse to run without a working database. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkOnStartup } = await import("./lib/server/startup-check");
    await checkOnStartup();
  }
}
