import "server-only";

import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { dateKeyOf, dayLabel, formatTime } from "@/lib/time";

/**
 * Historique de l'espace parents: ce que les enfants ont fait et dépensé,
 * regroupé par jour (dans le fuseau de la famille), le plus récent d'abord.
 */

export type ActivityChild = { name: string; avatar: string; color: string };

export type ActivityItem =
  | {
      kind: "task";
      id: string;
      title: string;
      child: ActivityChild;
      points: number;
      time: string;
    }
  | {
      kind: "reward" | "money";
      id: string;
      title: string;
      child: ActivityChild;
      points: number;
      time: string;
      status: string;
    };

export type ActivityDay = {
  dateKey: string;
  label: string;
  items: ActivityItem[];
  /** Pièces gagnées (tâches) ou dépensées (récompenses) dans la journée. */
  total: number;
};

/** On remonte deux semaines: au-delà, l'historique d'un enfant suffit. */
const DAYS = 14;

const CHILD = { select: { name: true, avatar: true, color: true } } as const;

function groupByDay(
  entries: { at: Date; item: ActivityItem }[],
  now: Date,
): ActivityDay[] {
  const days = new Map<string, ActivityDay>();
  for (const { at, item } of entries) {
    const dateKey = dateKeyOf(at);
    const day = days.get(dateKey) ?? { dateKey, label: dayLabel(dateKey, now), items: [], total: 0 };
    day.items.push(item);
    day.total += item.points;
    days.set(dateKey, day);
  }
  return [...days.values()];
}

export async function taskActivity(
  childId: string | null,
  now: Date = new Date(),
): Promise<ActivityDay[]> {
  const since = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
  const completions = await prisma.taskCompletion.findMany({
    where: { completedAt: { gte: since }, ...(childId ? { childId } : {}) },
    orderBy: { completedAt: "desc" },
    include: { child: CHILD, task: { select: { title: true } } },
  });

  return groupByDay(
    completions.map((completion) => ({
      at: completion.completedAt,
      item: {
        kind: "task",
        id: completion.id,
        title: completion.task?.title ?? "Tâche supprimée",
        child: completion.child,
        points: completion.pointsAwarded,
        time: formatTime(completion.completedAt),
      },
    })),
    now,
  );
}

export async function spendingActivity(
  childId: string | null,
  now: Date = new Date(),
): Promise<ActivityDay[]> {
  const since = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
  const where = { createdAt: { gte: since }, ...(childId ? { childId } : {}) };

  const [redemptions, conversions] = await Promise.all([
    prisma.rewardRedemption.findMany({ where, include: { child: CHILD } }),
    prisma.moneyConversion.findMany({ where, include: { child: CHILD } }),
  ]);

  const entries = [
    ...redemptions.map((redemption) => ({
      at: redemption.createdAt,
      item: {
        kind: "reward" as const,
        id: redemption.id,
        title: redemption.rewardName,
        child: redemption.child,
        points: redemption.pointsSpent,
        time: formatTime(redemption.createdAt),
        status: redemption.status,
      },
    })),
    ...conversions.map((conversion) => ({
      at: conversion.createdAt,
      item: {
        kind: "money" as const,
        id: conversion.id,
        title: `${formatMoney(conversion.amountCents)} en argent`,
        child: conversion.child,
        points: conversion.points,
        time: formatTime(conversion.createdAt),
        status: conversion.status,
      },
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return groupByDay(entries, now);
}
