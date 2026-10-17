import "server-only";

/**
 * Limitation des tentatives de NIP.
 *
 * Un NIP à 4 chiffres ne fait que 10 000 combinaisons: sans frein, on l'épuise
 * en quelques secondes sur un réseau local. Le vrai scénario n'est pas une
 * attaque sophistiquée, c'est quelqu'un de la maison — un invité, un ami des
 * enfants — qui essaie des codes jusqu'à entrer dans l'espace parents.
 *
 * L'état vit en mémoire du processus: l'add-on tourne dans un seul conteneur,
 * et un verrou qui disparaît au redémarrage reste préférable à pas de verrou.
 */

type Gate = { failures: number; lockedUntil: number };

const gates = new Map<string, Gate>();

/** Au-delà, chaque échec supplémentaire verrouille de plus en plus longtemps. */
const FREE_ATTEMPTS = 5;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 15 * 60;

function gateFor(key: string): Gate {
  const existing = gates.get(key);
  if (existing) return existing;

  const gate: Gate = { failures: 0, lockedUntil: 0 };
  gates.set(key, gate);
  return gate;
}

/**
 * Réserve une tentative: renvoie les secondes à attendre si le verrou est armé,
 * sinon compte la tentative comme un échec et renvoie 0. À appeler AVANT de
 * comparer le NIP; un NIP correct efface ensuite l'ardoise (`recordSuccess`).
 *
 * L'échec est compté d'avance parce que la comparaison bcrypt est asynchrone:
 * si on ne le comptait qu'après, des milliers de requêtes lancées en parallèle
 * passeraient toutes la barrière avant qu'un seul échec soit enregistré. La
 * vérification et la réservation se font sans `await` entre les deux, donc de
 * façon atomique dans le processus.
 */
export function reserveAttempt(key: string): number {
  const gate = gateFor(key);
  const remaining = gate.lockedUntil - Date.now();
  if (remaining > 0) return Math.ceil(remaining / 1000);

  recordFailure(key);
  return 0;
}

/** Enregistre un échec et arme le verrou quand les essais libres sont épuisés. */
function recordFailure(key: string): void {
  const gate = gateFor(key);
  gate.failures += 1;

  if (gate.failures <= FREE_ATTEMPTS) return;

  // Le délai double à chaque échec au-delà du seuil, jusqu'à un plafond.
  const factor = 2 ** (gate.failures - FREE_ATTEMPTS - 1);
  const seconds = Math.min(BASE_LOCK_SECONDS * factor, MAX_LOCK_SECONDS);
  gate.lockedUntil = Date.now() + seconds * 1000;
}

/** Un NIP correct efface l'ardoise. */
export function recordSuccess(key: string): void {
  gates.delete(key);
}

/** Message prêt à afficher, en minutes quand l'attente devient longue. */
export function retryMessage(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `Trop d'essais. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }
  return `Trop d'essais. Réessayez dans ${seconds} seconde${seconds > 1 ? "s" : ""}.`;
}
