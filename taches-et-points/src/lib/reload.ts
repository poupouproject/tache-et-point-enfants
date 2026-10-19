/**
 * Recharge la page, au plus une fois par minute.
 *
 * Sert quand la page est restée ouverte pendant une mise à jour. La limite
 * évite une boucle de rechargements si l'erreur venait d'ailleurs: au-delà,
 * la page d'erreur laisse un bouton.
 */
export function reloadOnce(delayMs = 1500): boolean {
  const key = "qp-reloaded-at";
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Stockage indisponible: on recharge quand même, une fois.
  }
  setTimeout(() => window.location.reload(), delayMs);
  return true;
}
