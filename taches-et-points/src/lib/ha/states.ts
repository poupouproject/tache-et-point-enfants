import "server-only";

import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pendingRequests } from "@/lib/rewards/service";
import { buildBoard, familyRemaining } from "@/lib/tasks/service";

/**
 * Capteurs exposés à Home Assistant, calculés à partir de la base.
 *
 * Les identifiants d'entité dérivent du prénom (« Éloi » → eloi): lisibles
 * dans les automatisations, au prix d'un changement si le prénom change.
 */

export const ENTITY_PREFIX = "sensor.quetes_pieces";

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "enfant";
}

export type HaState = {
  entityId: string;
  state: string | number;
  attributes: Record<string, unknown>;
};

export async function buildStates(now: Date = new Date()): Promise<HaState[]> {
  const [board, settings, { redemptions, conversions }] = await Promise.all([
    buildBoard(now),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
    pendingRequests(),
  ]);
  const pointsPerDollar = settings?.pointsPerDollar ?? 100;

  const states: HaState[] = [];
  const used = new Map<string, number>();

  for (const child of board) {
    // Deux enfants au même prénom: le second reçoit un suffixe.
    const base = slugify(child.name);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const slug = count > 1 ? `${base}_${count}` : base;

    const own = child.tasks.filter((task) => task.type !== "FAMILY");

    states.push({
      entityId: `${ENTITY_PREFIX}_${slug}`,
      state: child.balance,
      attributes: {
        friendly_name: `Pièces de ${child.name}`,
        unit_of_measurement: "pièces",
        state_class: "measurement",
        icon: "mdi:star-circle",
        enfant: child.name,
        enfant_id: child.id,
        avatar: child.avatar,
        valeur: formatMoney(Math.floor(child.balance / pointsPerDollar) * 100),
        serie: child.streak,
        taches_restantes: child.remaining,
      },
    });

    states.push({
      entityId: `${ENTITY_PREFIX}_${slug}_taches`,
      state: child.remaining,
      attributes: {
        friendly_name: `Tâches à faire de ${child.name}`,
        unit_of_measurement: "tâches",
        icon: "mdi:format-list-checks",
        enfant: child.name,
        enfant_id: child.id,
        taches: own.map((task) => task.title),
      },
    });
  }

  const familyTitles = [
    ...new Map(
      board.flatMap((child) => child.tasks).filter((task) => task.type === "FAMILY").map((task) => [task.id, task.title]),
    ).values(),
  ];

  states.push({
    entityId: `${ENTITY_PREFIX}_taches_familiales`,
    state: familyRemaining(board),
    attributes: {
      friendly_name: "Tâches au choix pour la famille",
      unit_of_measurement: "tâches",
      icon: "mdi:account-group",
      taches: familyTitles,
    },
  });

  const demandes = [
    ...redemptions.map((redemption) => ({
      type: "recompense",
      id: redemption.id,
      enfant: redemption.child.name,
      titre: redemption.rewardName,
      pieces: redemption.pointsSpent,
    })),
    ...conversions.map((conversion) => ({
      type: "argent",
      id: conversion.id,
      enfant: conversion.child.name,
      titre: `${formatMoney(conversion.amountCents)} en argent`,
      pieces: conversion.points,
    })),
  ];

  states.push({
    entityId: `${ENTITY_PREFIX}_demandes`,
    state: demandes.length,
    attributes: {
      friendly_name: "Demandes à approuver",
      unit_of_measurement: "demandes",
      icon: "mdi:gift-outline",
      demandes,
    },
  });

  return states;
}
