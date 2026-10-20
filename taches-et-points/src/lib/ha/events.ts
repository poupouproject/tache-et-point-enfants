import "server-only";

import { fireEvent, haEnabled } from "@/lib/ha/client";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/**
 * Événements publiés sur le bus de Home Assistant. Les automatisations s'en
 * servent comme déclencheurs: notification, annonce vocale, lumière…
 *
 * - quetes_pieces_demande  : un enfant demande une récompense ou de l'argent
 * - quetes_pieces_decision : une demande est approuvée ou refusée
 * - quetes_pieces_tache    : un enfant a confirmé une tâche
 *
 * Les champs sont en français, comme le reste de l'app: c'est ce que le
 * parent lit en écrivant son automatisation.
 */

export type RequestKind = "recompense" | "argent";

async function loadRequest(kind: RequestKind, id: string) {
  if (kind === "recompense") {
    const row = await prisma.rewardRedemption.findUnique({
      where: { id },
      include: { child: { select: { id: true, name: true } } },
    });
    return row && { child: row.child, titre: row.rewardName, pieces: row.pointsSpent };
  }
  const row = await prisma.moneyConversion.findUnique({
    where: { id },
    include: { child: { select: { id: true, name: true } } },
  });
  return (
    row && {
      child: row.child,
      titre: `${formatMoney(row.amountCents)} en argent`,
      pieces: row.points,
      montant: formatMoney(row.amountCents),
    }
  );
}

export async function announceRequest(kind: RequestKind, id: string): Promise<void> {
  if (!haEnabled()) return;
  const request = await loadRequest(kind, id);
  if (!request) return;

  fireEvent("quetes_pieces_demande", {
    type: kind,
    id,
    enfant: request.child.name,
    enfant_id: request.child.id,
    titre: request.titre,
    pieces: request.pieces,
    ...("montant" in request ? { montant: request.montant } : {}),
    message: `${request.child.name} demande « ${request.titre} » (${request.pieces} pièces)`,
  });
}

export async function announceDecision(
  kind: RequestKind,
  id: string,
  approved: boolean,
  source: "app" | "home_assistant",
): Promise<void> {
  if (!haEnabled()) return;
  const request = await loadRequest(kind, id);
  if (!request) return;

  fireEvent("quetes_pieces_decision", {
    type: kind,
    id,
    decision: approved ? "approuvee" : "refusee",
    enfant: request.child.name,
    enfant_id: request.child.id,
    titre: request.titre,
    source,
  });
}

export async function announceTask(completionId: string): Promise<void> {
  if (!haEnabled()) return;
  const completion = await prisma.taskCompletion.findUnique({
    where: { id: completionId },
    include: { child: { select: { id: true, name: true } }, task: { select: { title: true } } },
  });
  if (!completion) return;

  fireEvent("quetes_pieces_tache", {
    enfant: completion.child.name,
    enfant_id: completion.child.id,
    tache: completion.task?.title ?? "Tâche",
    pieces: completion.pointsAwarded,
  });
}
