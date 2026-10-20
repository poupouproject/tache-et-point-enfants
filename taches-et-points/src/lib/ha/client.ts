import "server-only";

/**
 * Client de l'API de Home Assistant.
 *
 * Dans l'add-on, le Supervisor fournit SUPERVISOR_TOKEN (grâce à
 * `homeassistant_api: true` dans config.yaml) et relaie l'API de Home
 * Assistant à http://supervisor/core/api. Hors add-on, HA_URL et HA_TOKEN (un
 * jeton longue durée) font la même chose. Sans l'un ni l'autre, tout est sans
 * effet: l'app fonctionne seule.
 *
 * Home Assistant n'est jamais sur le chemin critique: un appel qui échoue est
 * noté au journal et l'action de l'enfant ou du parent n'en souffre pas.
 */

type Target = { base: string; token: string };

function target(): Target | null {
  if (process.env.SUPERVISOR_TOKEN) {
    return { base: "http://supervisor/core/api", token: process.env.SUPERVISOR_TOKEN };
  }
  if (process.env.HA_URL && process.env.HA_TOKEN) {
    return { base: `${process.env.HA_URL.replace(/\/+$/, "")}/api`, token: process.env.HA_TOKEN };
  }
  return null;
}

export function haEnabled(): boolean {
  return target() !== null;
}

/** Dernier échec, affiché dans les réglages pour aider au diagnostic. */
let lastError: { at: Date; message: string } | null = null;
let lastSuccess: Date | null = null;

export function haStatus() {
  return { enabled: haEnabled(), lastError, lastSuccess };
}

async function post(path: string, body: unknown): Promise<boolean> {
  const to = target();
  if (!to) return false;

  try {
    const response = await fetch(`${to.base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${to.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} sur ${path}`);
    lastSuccess = new Date();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Une seule ligne par minute: si HA redémarre, inutile d'inonder le journal.
    if (!lastError || Date.now() - lastError.at.getTime() > 60_000) {
      console.warn(`[taches-et-points] Home Assistant injoignable: ${message}`);
    }
    lastError = { at: new Date(), message };
    return false;
  }
}

/** Publie un événement sur le bus de Home Assistant (déclencheur d'automatisation). */
export function fireEvent(type: string, data: Record<string, unknown>): void {
  if (!haEnabled()) return;
  void post(`/events/${type}`, data);
}

/** Crée ou met à jour l'état d'une entité (capteur). */
export function setState(
  entityId: string,
  state: string | number,
  attributes: Record<string, unknown>,
): Promise<boolean> {
  return post(`/states/${entityId}`, { state: String(state), attributes });
}
