import "server-only";

import { balanceOf, pointsToCents, recordTransaction } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

export type SpendResult =
  | { ok: true }
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

  return prisma.$transaction(async (tx) => {
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

    return { ok: true } as const;
  });
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

  return prisma.$transaction(async (tx) => {
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

    return { ok: true } as const;
  });
}

/**
 * Résolution d'une demande de récompense par un parent.
 * Un refus recrédite les points via une écriture inverse — jamais en effaçant
 * le débit d'origine, pour que l'historique montre la demande et son refus.
 */
export async function resolveRedemption(
  redemptionId: string,
  status: "FULFILLED" | "REJECTED",
): Promise<boolean> {
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id: redemptionId },
  });

  if (!redemption || redemption.status !== "PENDING") return false;

  await prisma.$transaction(async (tx) => {
    await tx.rewardRedemption.update({
      where: { id: redemption.id },
      data: { status, resolvedAt: new Date() },
    });

    if (status === "REJECTED") {
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
  });

  return true;
}

/** Résolution d'une demande de conversion en argent par un parent. */
export async function resolveConversion(
  conversionId: string,
  status: "PAID" | "REJECTED",
): Promise<boolean> {
  const conversion = await prisma.moneyConversion.findUnique({
    where: { id: conversionId },
  });

  if (!conversion || conversion.status !== "PENDING") return false;

  await prisma.$transaction(async (tx) => {
    await tx.moneyConversion.update({
      where: { id: conversion.id },
      data: { status, resolvedAt: new Date() },
    });

    if (status === "REJECTED") {
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
  });

  return true;
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
