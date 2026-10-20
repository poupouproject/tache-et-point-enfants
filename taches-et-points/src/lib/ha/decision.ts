import "server-only";

import { timingSafeEqual } from "node:crypto";

import { announceDecision, type RequestKind } from "@/lib/ha/events";
import { scheduleHaSync } from "@/lib/ha/sync";
import { resolveConversion, resolveRedemption } from "@/lib/rewards/service";

/**
 * Décision envoyée par Home Assistant (rest_command), typiquement depuis les
 * boutons d'une notification.
 *
 * Le jeton est généré par l'add-on au premier démarrage (HA_DECISION_TOKEN) et
 * affiché dans les réglages de l'app. Sans lui, n'importe quel appareil du
 * réseau local pourrait approuver une conversion en argent.
 */

export function decisionToken(): string | null {
  const token = process.env.HA_DECISION_TOKEN?.trim();
  return token && token.length >= 32 ? token : null;
}

export function isAuthorized(header: string | null): boolean {
  const expected = decisionToken();
  if (!expected || !header) return false;
  const given = Buffer.from(header.replace(/^Bearer\s+/i, "").trim());
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export type DecisionResult =
  | { ok: true; applied: boolean }
  | { ok: false; error: string };

/**
 * Applique la décision. `applied: false` veut dire que la demande était déjà
 * réglée (un autre parent, ou un deuxième tap sur la notification): rien n'est
 * fait deux fois, la résolution n'agit que sur une demande en attente.
 */
export async function applyDecision(body: unknown): Promise<DecisionResult> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "corps JSON attendu" };
  const { type, id, decision } = body as Record<string, unknown>;

  if (type !== "recompense" && type !== "argent") {
    return { ok: false, error: "type: « recompense » ou « argent »" };
  }
  if (typeof id !== "string" || !id) return { ok: false, error: "id manquant" };
  if (decision !== "approuver" && decision !== "refuser") {
    return { ok: false, error: "decision: « approuver » ou « refuser »" };
  }

  const approve = decision === "approuver";
  const applied =
    type === "recompense"
      ? await resolveRedemption(id, approve ? "FULFILLED" : "REJECTED")
      : await resolveConversion(id, approve ? "PAID" : "REJECTED");

  if (applied) {
    void announceDecision(type as RequestKind, id, approve, "home_assistant");
    scheduleHaSync();
  }
  return { ok: true, applied };
}
