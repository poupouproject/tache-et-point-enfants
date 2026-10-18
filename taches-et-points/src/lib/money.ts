/**
 * Conversions d'argent, sans accès à la base: utilisables aussi bien par le
 * serveur que par les composants du navigateur.
 */

/** Convertit des points en cents, au taux configuré. */
export function pointsToCents(points: number, pointsPerDollar: number): number {
  if (pointsPerDollar <= 0) return 0;
  return Math.round((points / pointsPerDollar) * 100);
}

/** Formate un montant en cents, ex. 1250 -> « 12,50 $ ». */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}
