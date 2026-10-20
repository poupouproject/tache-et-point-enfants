/**
 * Lancé une fois au démarrage du serveur Next: démarre la publication des
 * capteurs vers Home Assistant quand l'app tourne en add-on.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startHaSync } = await import("@/lib/ha/sync");
  startHaSync();
}
