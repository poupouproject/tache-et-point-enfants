/**
 * Grand livre de points.
 *
 * Règle unique et non négociable: on n'écrit jamais un solde. Toute variation
 * de points passe par une ligne de `Transaction` (append-only) et un solde est
 * toujours une somme. C'est ce qui rend l'historique auditable — important
 * quand des points finissent par se convertir en argent réel.
 */

import type { Prisma } from "@/generated/prisma/client";
import type {
  Actor,
  TransactionSource,
  TransactionType,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/** Client Prisma ou transaction interactive — permet de composer les écritures. */
type Db = Prisma.TransactionClient | typeof prisma;

export type LedgerEntry = {
  childId: string;
  type: TransactionType;
  /** Signé: positif = crédit, négatif = débit */
  points: number;
  source: TransactionSource;
  sourceRef?: string | null;
  description: string;
  createdBy?: Actor;
};

/** Écrit une ligne au grand livre. */
export function recordTransaction(db: Db, entry: LedgerEntry) {
  return db.transaction.create({
    data: {
      childId: entry.childId,
      type: entry.type,
      points: entry.points,
      source: entry.source,
      sourceRef: entry.sourceRef ?? null,
      description: entry.description,
      createdBy: entry.createdBy ?? "CHILD",
    },
  });
}

/** Solde d'un enfant, dérivé du grand livre. */
export async function balanceOf(db: Db, childId: string): Promise<number> {
  const result = await db.transaction.aggregate({
    where: { childId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/** Soldes de tous les enfants en une requête, indexés par childId. */
export async function balancesByChild(
  db: Db = prisma,
): Promise<Map<string, number>> {
  const rows = await db.transaction.groupBy({
    by: ["childId"],
    _sum: { points: true },
  });

  return new Map(rows.map((row) => [row.childId, row._sum.points ?? 0]));
}

/**
 * Débite des points après avoir vérifié le solde, dans une transaction DB.
 * Le contrôle de solde et l'écriture doivent être atomiques: deux demandes
 * simultanées ne doivent pas pouvoir faire passer le solde sous zéro.
 */
export async function spendPoints(
  db: Prisma.TransactionClient,
  entry: Omit<LedgerEntry, "points"> & { points: number },
): Promise<{ ok: true } | { ok: false; reason: "INSUFFICIENT_FUNDS" }> {
  const current = await balanceOf(db, entry.childId);
  if (current < entry.points) {
    return { ok: false, reason: "INSUFFICIENT_FUNDS" };
  }

  await recordTransaction(db, { ...entry, points: -entry.points });
  return { ok: true };
}

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
