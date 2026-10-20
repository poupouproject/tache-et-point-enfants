import "server-only";

import { haEnabled, setState } from "@/lib/ha/client";
import { buildStates } from "@/lib/ha/states";

/**
 * Publication des capteurs vers Home Assistant.
 *
 * Après chaque changement (tâche confirmée, achat, décision, réglage), et
 * toutes les cinq minutes: les états publiés par l'API ne survivent pas à un
 * redémarrage de Home Assistant, et « tâches à faire » change à minuit sans
 * que personne ne touche à rien.
 */

const DEBOUNCE_MS = 1500;
const REFRESH_MS = 5 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

export async function publishStates(): Promise<void> {
  if (!haEnabled() || running) return;
  running = true;
  try {
    for (const { entityId, state, attributes } of await buildStates()) {
      await setState(entityId, state, attributes);
    }
  } catch (error) {
    console.warn("[taches-et-points] capteurs Home Assistant non publiés:", error);
  } finally {
    running = false;
  }
}

/** Planifie une publication: plusieurs changements rapprochés n'en font qu'une. */
export function scheduleHaSync(): void {
  if (!haEnabled()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void publishStates();
  }, DEBOUNCE_MS);
}

let started = false;

/** Lancé une fois au démarrage du serveur (instrumentation.ts). */
export function startHaSync(): void {
  if (started || !haEnabled()) return;
  started = true;
  console.log("[taches-et-points] Home Assistant connecté: capteurs et événements activés");
  setTimeout(() => void publishStates(), 5000);
  setInterval(() => void publishStates(), REFRESH_MS).unref();
}
