import "server-only";

import { prisma } from "@/lib/prisma";
import { balancesByChild, recordTransaction } from "@/lib/ledger";
import { isDueNow, periodKeyFor } from "@/lib/tasks/due";
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
      periodKey: { in: [...new Set(tasks.map((t) => periodKeyFor(t.recurrence, now)))] },
    },
    include: { child: { select: { name: true } } },
  });

  const takenKey = (taskId: string, periodKey: string) => `${taskId}::${periodKey}`;
  const taken = new Map(
    completions.map((c) => [takenKey(c.taskId, c.periodKey), c]),
  );

  const todayKey = dateKeyOf(now);
  const streaks = await computeStreaks(
    children.map((child) => child.id),
    todayKey,
  );

  return children.map((child) => {
    const dueTasks: DueTask[] = [];

    for (const task of tasks) {
      if (!isDueNow(task, now)) continue;

      // Une tâche individuelle n'apparaît que chez l'enfant à qui elle est assignée.
      if (task.type === "INDIVIDUAL" && task.assignedChildId !== child.id) {
        continue;
      }

      const periodKey = periodKeyFor(task.recurrence, now);
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

    const doneToday = completions
      .filter(
        (completion) =>
          completion.childId === child.id &&
          dateKeyOf(completion.completedAt) === todayKey,
      )
      .map((completion) => ({
        title: tasks.find((task) => task.id === completion.taskId)?.title ?? "Tâche",
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
      doneToday,
    };
  });
}

/**
 * Série de jours consécutifs avec au moins une tâche confirmée.
 * La série d'aujourd'hui compte, mais ne se brise pas tant que la journée
 * n'est pas finie: on repart d'hier si rien n'a encore été fait aujourd'hui.
 */
async function computeStreaks(
  childIds: string[],
  todayKey: string,
): Promise<Map<string, number>> {
  if (childIds.length === 0) return new Map();

  // 60 jours suffisent largement pour une série familiale, et bornent la lecture.
  const since = new Date();
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

  const periodKey = periodKeyFor(task.recurrence, now);

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
 */
export async function revokeCompletion(completionId: string): Promise<boolean> {
  const completion = await prisma.taskCompletion.findUnique({
    where: { id: completionId },
    include: { task: { select: { title: true } } },
  });

  if (!completion) return false;

  await prisma.$transaction(async (tx) => {
    await tx.taskCompletion.delete({ where: { id: completion.id } });

    await recordTransaction(tx, {
      childId: completion.childId,
      type: "MANUAL_ADJUST",
      points: -completion.pointsAwarded,
      source: "MANUAL",
      sourceRef: completion.id,
      description: `Annulé: ${completion.task?.title ?? "tâche"}`,
      createdBy: "PARENT",
    });
  });

  return true;
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
