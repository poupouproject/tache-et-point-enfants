import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { balancesByChild, recordTransaction } from "@/lib/ledger";
import { isDueNow, occurrenceKey } from "@/lib/tasks/due";
import { dateKeyOf, shiftDateKey, localParts } from "@/lib/time";

export type DueTask = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  type: string;
  pointsValue: number;
  recurrence: string;
  weekdays: string | null;
  periodKey: string;
};

export type ChildBoard = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  balance: number;
  streak: number;
  tasks: DueTask[];
  /** Tâches individuelles encore à faire aujourd'hui: ce que l'enfant DOIT faire. */
  remaining: number;
  doneToday: { title: string; points: number }[];
};

/**
 * Construit le tableau de bord complet: pour chaque enfant, son solde, sa série
 * et les tâches qu'il peut confirmer maintenant.
 *
 * Les tâches familiales déjà prises par quelqu'un pour l'occurrence courante
 * disparaissent de la liste de tout le monde — c'est le « premier arrivé,
 * premier servi ».
 */
export async function buildBoard(now: Date = new Date()): Promise<ChildBoard[]> {
  const [children, tasks, balances] = await Promise.all([
    prisma.child.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.task.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    balancesByChild(),
  ]);

  // Les occurrences déjà prises, pour toutes les tâches actives d'un coup.
  const completions = await prisma.taskCompletion.findMany({
    where: {
      taskId: { in: tasks.map((task) => task.id) },
      periodKey: {
        in: [
          ...new Set(
            tasks.flatMap((task) =>
              children.map((child) => occurrenceKey(task, child.id, now)),
            ),
          ),
        ],
      },
    },
    include: { child: { select: { name: true } } },
  });

  const takenKey = (taskId: string, periodKey: string) => `${taskId}::${periodKey}`;
  const taken = new Map(
    completions.map((c) => [takenKey(c.taskId, c.periodKey), c]),
  );

  const todayKey = dateKeyOf(now);

  // Ce qui a été fait aujourd'hui se lit indépendamment des tâches actives:
  // masquer une tâche ne doit pas effacer d'un coup le travail déjà accompli
  // par un enfant sur sa carte. On repart de la veille pour couvrir tous les
  // fuseaux, puis on filtre sur la journée locale.
  const since = new Date(now);
  since.setDate(since.getDate() - 2);

  const todayCompletions = await prisma.taskCompletion.findMany({
    where: { completedAt: { gte: since } },
    include: { task: { select: { title: true } } },
  });

  const streaks = await computeStreaks(
    children.map((child) => child.id),
    todayKey,
    now,
  );

  return children.map((child) => {
    const dueTasks: DueTask[] = [];

    for (const task of tasks) {
      if (!isDueNow(task, now)) continue;

      // Une tâche individuelle n'apparaît que chez l'enfant à qui elle est assignée.
      if (task.type === "INDIVIDUAL" && task.assignedChildId !== child.id) {
        continue;
      }

      const periodKey = occurrenceKey(task, child.id, now);
      if (taken.has(takenKey(task.id, periodKey))) continue;

      dueTasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        icon: task.icon,
        type: task.type,
        pointsValue: task.pointsValue,
        recurrence: task.recurrence,
        weekdays: task.weekdays,
        periodKey,
      });
    }

    const doneToday = todayCompletions
      .filter(
        (completion) =>
          completion.childId === child.id &&
          dateKeyOf(completion.completedAt) === todayKey,
      )
      .map((completion) => ({
        title: completion.task?.title ?? "Tâche",
        points: completion.pointsAwarded,
      }));

    return {
      id: child.id,
      name: child.name,
      avatar: child.avatar,
      color: child.color,
      balance: balances.get(child.id) ?? 0,
      streak: streaks.get(child.id) ?? 0,
      tasks: dueTasks,
      // Ce qui est imposé à l'enfant: ses tâches et celles de chaque enfant.
      remaining: dueTasks.filter((task) => task.type !== "FAMILY").length,
      doneToday,
    };
  });
}

/**
 * Tâches familiales encore libres, pour le compteur du tableau de bord.
 *
 * Une tâche familiale disponible figure dans la liste de chaque enfant: on la
 * compte une seule fois, par identifiant.
 */
export function familyRemaining(board: ChildBoard[]): number {
  const ids = new Set<string>();
  for (const child of board) {
    for (const task of child.tasks) {
      if (task.type === "FAMILY") ids.add(task.id);
    }
  }
  return ids.size;
}

/**
 * Série de jours consécutifs avec au moins une tâche confirmée.
 * La série d'aujourd'hui compte, mais ne se brise pas tant que la journée
 * n'est pas finie: on repart d'hier si rien n'a encore été fait aujourd'hui.
 */
async function computeStreaks(
  childIds: string[],
  todayKey: string,
  now: Date,
): Promise<Map<string, number>> {
  if (childIds.length === 0) return new Map();

  // 60 jours suffisent largement pour une série familiale, et bornent la lecture.
  const since = new Date(now);
  since.setDate(since.getDate() - 60);

  const completions = await prisma.taskCompletion.findMany({
    where: { childId: { in: childIds }, completedAt: { gte: since } },
    select: { childId: true, completedAt: true },
  });

  const daysByChild = new Map<string, Set<string>>();
  for (const completion of completions) {
    const days = daysByChild.get(completion.childId) ?? new Set<string>();
    days.add(dateKeyOf(completion.completedAt));
    daysByChild.set(completion.childId, days);
  }

  const streaks = new Map<string, number>();
  for (const childId of childIds) {
    const days = daysByChild.get(childId) ?? new Set<string>();

    let cursor = days.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
    let streak = 0;

    while (days.has(cursor)) {
      streak += 1;
      cursor = shiftDateKey(cursor, -1);
    }

    streaks.set(childId, streak);
  }

  return streaks;
}

/** Série d'un seul enfant, sans construire le tableau de toute la famille. */
export async function streakOf(
  childId: string,
  now: Date = new Date(),
): Promise<number> {
  const streaks = await computeStreaks([childId], dateKeyOf(now), now);
  return streaks.get(childId) ?? 0;
}

/**
 * Un enfant désactivé garde son historique mais ne gagne ni ne dépense plus.
 * Les Server Actions reçoivent le childId du formulaire: sans ce contrôle, un
 * POST direct suffirait à créditer un enfant masqué ou un identifiant inventé.
 */
export async function isActiveChild(childId: string): Promise<boolean> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { active: true },
  });
  return child?.active === true;
}

export type CompleteResult =
  | { ok: true; points: number; title: string }
  | { ok: false; reason: "ALREADY_TAKEN" | "NOT_AVAILABLE" };

/**
 * Confirme une tâche pour un enfant. Les points sont accordés immédiatement
 * (confiance par défaut) — un parent peut annuler ensuite.
 *
 * La course entre deux enfants sur une tâche familiale est arbitrée par la
 * contrainte unique (taskId, periodKey) en base, pas par une vérification
 * préalable: seule la base peut trancher deux clics simultanés.
 */
export async function completeTask(
  taskId: string,
  childId: string,
  now: Date = new Date(),
): Promise<CompleteResult> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task || !task.active) return { ok: false, reason: "NOT_AVAILABLE" };
  if (!isDueNow(task, now)) return { ok: false, reason: "NOT_AVAILABLE" };
  if (task.type === "INDIVIDUAL" && task.assignedChildId !== childId) {
    return { ok: false, reason: "NOT_AVAILABLE" };
  }
  if (!(await isActiveChild(childId))) {
    return { ok: false, reason: "NOT_AVAILABLE" };
  }

  const periodKey = occurrenceKey(task, childId, now);

  try {
    await prisma.$transaction(async (tx) => {
      const completion = await tx.taskCompletion.create({
        data: {
          taskId: task.id,
          childId,
          periodKey,
          pointsAwarded: task.pointsValue,
        },
      });

      await recordTransaction(tx, {
        childId,
        type: "EARNED",
        points: task.pointsValue,
        source: "TASK",
        sourceRef: completion.id,
        description: task.title,
        createdBy: "CHILD",
      });
    });
  } catch (error) {
    // P2002 = violation de contrainte unique: quelqu'un a confirmé avant.
    if (isUniqueViolation(error)) return { ok: false, reason: "ALREADY_TAKEN" };
    throw error;
  }

  return { ok: true, points: task.pointsValue, title: task.title };
}

/**
 * Annule une confirmation (mode parent).
 *
 * On supprime la TaskCompletion — c'est de l'état, et sa disparition rend
 * l'occurrence à nouveau disponible — mais on n'efface jamais la transaction
 * d'origine: on ajoute une écriture inverse, pour que l'historique montre à la
 * fois le gain et son annulation.
 *
 * La lecture et la suppression sont dans la même transaction, et seule la
 * requête qui supprime vraiment la ligne écrit l'inverse: un double clic sur
 * « Annuler » ne retire pas les points deux fois et ne lève pas d'erreur.
 */
export async function revokeCompletion(completionId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const completion = await tx.taskCompletion.findUnique({
      where: { id: completionId },
      include: { task: { select: { title: true } } },
    });
    if (!completion) return false;

    const deleted = await tx.taskCompletion.deleteMany({
      where: { id: completion.id },
    });
    if (deleted.count === 0) return false;

    await recordTransaction(tx, {
      childId: completion.childId,
      type: "MANUAL_ADJUST",
      points: -completion.pointsAwarded,
      source: "MANUAL",
      sourceRef: completion.id,
      description: `Annulé: ${completion.task?.title ?? "tâche"}`,
      createdBy: "PARENT",
    });

    return true;
  });
}

/**
 * Met à jour une tâche et, si sa récurrence change, remappe ses complétions
 * dans la même transaction. Faites en deux temps, les deux écritures laissaient
 * une fenêtre où la tâche portait déjà sa nouvelle récurrence sans qu'aucune
 * complétion ne corresponde à la nouvelle clé: un enfant pouvait la confirmer
 * — et être payé — une deuxième fois.
 */
export async function updateTask(
  taskId: string,
  data: Prisma.TaskUncheckedUpdateInput & { recurrence: string },
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({ where: { id: taskId } });
    if (!existing) return false;

    await tx.task.update({ where: { id: taskId }, data });

    // La clé dépend de la récurrence, et du type quand on passe à « chaque
    // enfant » ou qu'on le quitte (la clé porte alors l'enfant).
    const type = typeof data.type === "string" ? data.type : existing.type;
    const perChild = (value: string) => value === "EACH";
    if (
      existing.recurrence !== data.recurrence ||
      perChild(existing.type) !== perChild(type)
    ) {
      await remapCompletionPeriods(tx, taskId, { type, recurrence: data.recurrence });
    }

    return true;
  });
}

/** Préfixe des clés d'occurrence mises de côté par un remappage. */
const ARCHIVED_PERIOD_PREFIX = "archive:";

/**
 * Réécrit les clés d'occurrence après un changement de récurrence, ou de type
 * vers ou depuis « chaque enfant ».
 *
 * La `periodKey` dérive de la récurrence: passer une tâche de quotidienne à
 * hebdomadaire change la forme de la clé, et les complétions existantes ne
 * correspondent alors plus à rien. La tâche réapparaîtrait comme à faire alors
 * qu'elle a déjà été payée aujourd'hui — donc payée deux fois.
 *
 * On recalcule donc chaque clé à partir de la date de complétion. Quand
 * plusieurs complétions retombent sur la même occurrence (deux jours de la
 * même semaine qui deviennent une seule semaine), la plus récente prend la
 * clé de l'occurrence. Les autres ne sont pas supprimées: elles portent les
 * séries, la liste « fait aujourd'hui » et l'annulation par un parent. Elles
 * reçoivent une clé d'archive qui leur est propre, qui ne correspond à aucune
 * occurrence et respecte la contrainte unique (taskId, periodKey).
 *
 * Appelée dans la transaction qui change la récurrence (voir `updateTask`).
 */
export async function remapCompletionPeriods(
  tx: Prisma.TransactionClient,
  taskId: string,
  task: { type: string; recurrence: string },
): Promise<void> {
  const completions = await tx.taskCompletion.findMany({
    where: { taskId },
    orderBy: { completedAt: "desc" },
  });

  if (completions.length === 0) return;

  const targets = new Map<string, string>(); // id -> nouvelle clé
  const claimed = new Set<string>();

  // Les complétions sont triées de la plus récente à la plus ancienne: la
  // première rencontrée pour une clé est donc celle qui la prend.
  for (const completion of completions) {
    const key = occurrenceKey(task, completion.childId, completion.completedAt);
    if (claimed.has(key)) {
      targets.set(completion.id, `${ARCHIVED_PERIOD_PREFIX}${completion.id}`);
    } else {
      claimed.add(key);
      targets.set(completion.id, key);
    }
  }

  // Deux passes: une clé visée peut être occupée par une autre complétion
  // pas encore réécrite. On libère d'abord toutes les clés en passant par
  // l'archive, puis on pose les clés définitives.
  for (const id of targets.keys()) {
    await tx.taskCompletion.update({
      where: { id },
      data: { periodKey: `${ARCHIVED_PERIOD_PREFIX}${id}` },
    });
  }

  for (const [id, periodKey] of targets) {
    if (periodKey.startsWith(ARCHIVED_PERIOD_PREFIX)) continue;
    await tx.taskCompletion.update({ where: { id }, data: { periodKey } });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Confirmations récentes, pour l'écran d'annulation du mode parent. */
export async function recentCompletions(limit = 40) {
  const completions = await prisma.taskCompletion.findMany({
    orderBy: { completedAt: "desc" },
    take: limit,
    include: {
      child: { select: { name: true, color: true, avatar: true } },
      task: { select: { title: true, icon: true } },
    },
  });

  return completions.map((completion) => ({
    ...completion,
    isToday: dateKeyOf(completion.completedAt) === localParts().dateKey,
  }));
}
