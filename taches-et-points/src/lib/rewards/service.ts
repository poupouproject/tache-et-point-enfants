import "server-only";

import { balanceOf, pointsToCents, recordTransaction } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { announceRequest } from "@/lib/ha/events";
import { isActiveChild } from "@/lib/tasks/service";

export type SpendResult =
  | { ok: true; id: string }
  | { ok: false; reason: "INSUFFICIENT_FUNDS" | "NOT_FOUND" };

/**
 * Demande d'échange contre une récompense.
 *
 * Les points sont débités tout de suite: le solde affiché doit toujours être
 * dépensable, sinon un enfant pourrait « dépenser » deux fois les mêmes points
 * avec deux demandes en attente. Un refus du parent les recrédite.
 *
 * Le contrôle de solde et le débit sont dans la même transaction DB pour que
 * deux demandes simultanées ne puissent pas passer sous zéro.
 */
export async function requestReward(
  childId: string,
  rewardId: string,
): Promise<SpendResult> {
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward || !reward.active) return { ok: false, reason: "NOT_FOUND" };
  if (!(await isActiveChild(childId))) return { ok: false, reason: "NOT_FOUND" };

  const result = await prisma.$transaction(async (tx) => {
    const balance = await balanceOf(tx, childId);
    if (balance < reward.costPoints) {
      return { ok: false, reason: "INSUFFICIENT_FUNDS" } as const;
    }

    const redemption = await tx.rewardRedemption.create({
      data: {
        childId,
        rewardId: reward.id,
        rewardName: reward.name,
        pointsSpent: reward.costPoints,
      },
    });

    await recordTransaction(tx, {
      childId,
      type: "SPENT_REWARD",
      points: -reward.costPoints,
      source: "REWARD",
      sourceRef: redemption.id,
      description: reward.name,
      createdBy: "CHILD",
    });

    return { ok: true, id: redemption.id } as const;
  });

  // Après la transaction: Home Assistant ne doit voir que des demandes réelles.
  if (result.ok) void announceRequest("recompense", result.id);
  return result;
}

/** Demande de conversion de points en argent réel. */
export async function requestConversion(
  childId: string,
  points: number,
): Promise<SpendResult> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) return { ok: false, reason: "NOT_FOUND" };

  const amountCents = pointsToCents(points, settings.pointsPerDollar);
  if (points <= 0 || amountCents <= 0) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  if (!(await isActiveChild(childId))) return { ok: false, reason: "NOT_FOUND" };

  const result = await prisma.$transaction(async (tx) => {
    const balance = await balanceOf(tx, childId);
    if (balance < points) {
      return { ok: false, reason: "INSUFFICIENT_FUNDS" } as const;
    }

    const conversion = await tx.moneyConversion.create({
      data: { childId, points, amountCents },
    });

    await recordTransaction(tx, {
      childId,
      type: "CONVERTED_MONEY",
      points: -points,
      source: "CONVERSION",
      sourceRef: conversion.id,
      description: `Conversion en argent`,
      createdBy: "CHILD",
    });

    return { ok: true, id: conversion.id } as const;
  });

  if (result.ok) void announceRequest("argent", result.id);
  return result;
}

/**
 * Résolution d'une demande de récompense par un parent.
 * Un refus recrédite les points via une écriture inverse — jamais en effaçant
 * le débit d'origine, pour que l'historique montre la demande et son refus.
 *
 * Le passage de PENDING au statut final est un `updateMany` filtré sur PENDING,
 * dans la même transaction que le remboursement: si un parent tape deux fois
 * « Refuser », seul le premier clic change la ligne, donc seul lui rembourse.
 */
export async function resolveRedemption(
  redemptionId: string,
  status: "FULFILLED" | "REJECTED",
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const resolved = await tx.rewardRedemption.updateMany({
      where: { id: redemptionId, status: "PENDING" },
      data: { status, resolvedAt: new Date() },
    });
    if (resolved.count === 0) return false;

    if (status === "REJECTED") {
      const redemption = await tx.rewardRedemption.findUniqueOrThrow({
        where: { id: redemptionId },
      });

      await recordTransaction(tx, {
        childId: redemption.childId,
        type: "MANUAL_ADJUST",
        points: redemption.pointsSpent,
        source: "REWARD",
        sourceRef: redemption.id,
        description: `Remboursé: ${redemption.rewardName}`,
        createdBy: "PARENT",
      });
    }

    return true;
  });
}

/** Résolution d'une demande de conversion en argent par un parent. */
export async function resolveConversion(
  conversionId: string,
  status: "PAID" | "REJECTED",
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Même garde que pour les récompenses: un seul refus rembourse.
    const resolved = await tx.moneyConversion.updateMany({
      where: { id: conversionId, status: "PENDING" },
      data: { status, resolvedAt: new Date() },
    });
    if (resolved.count === 0) return false;

    if (status === "REJECTED") {
      const conversion = await tx.moneyConversion.findUniqueOrThrow({
        where: { id: conversionId },
      });

      await recordTransaction(tx, {
        childId: conversion.childId,
        type: "MANUAL_ADJUST",
        points: conversion.points,
        source: "CONVERSION",
        sourceRef: conversion.id,
        description: "Remboursé: conversion refusée",
        createdBy: "PARENT",
      });
    }

    return true;
  });
}

/** Demandes en attente, pour le badge et l'écran d'approbation du mode parent. */
export async function pendingRequests() {
  const [redemptions, conversions] = await Promise.all([
    prisma.rewardRedemption.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { child: { select: { name: true, avatar: true, color: true } } },
    }),
    prisma.moneyConversion.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { child: { select: { name: true, avatar: true, color: true } } },
    }),
  ]);

  return { redemptions, conversions };
}
