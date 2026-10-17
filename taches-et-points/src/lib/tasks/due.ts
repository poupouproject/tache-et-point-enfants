/**
 * Moteur de récurrence.
 *
 * Il n'y a volontairement aucun cron: on ne « génère » pas d'occurrences à
 * l'avance. À chaque affichage, on calcule si une tâche est due maintenant et
 * quelle est la clé de son occurrence courante (`periodKey`). Une occurrence
 * est considérée faite s'il existe une TaskCompletion pour ce (taskId, periodKey).
 *
 * Conséquence utile: quand la période change (un nouveau jour, une nouvelle
 * semaine), la clé change et la tâche redevient automatiquement disponible,
 * sans job de réinitialisation.
 */

import type { Recurrence } from "@/lib/constants";
import { isoWeekKey, localParts } from "@/lib/time";

export type TaskRecurrenceInput = {
  recurrence: string;
  /** CSV de jours 0-6 (0 = dimanche), utilisé seulement pour WEEKDAYS */
  weekdays: string | null;
};

/** Parse la liste CSV de jours d'une tâche WEEKDAYS. */
export function parseWeekdays(weekdays: string | null): number[] {
  if (!weekdays) return [];
  return weekdays
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

/**
 * Clé identifiant l'occurrence courante d'une tâche.
 * - DAILY / WEEKDAYS : le jour local (une occurrence par jour)
 * - WEEKLY           : la semaine ISO (une occurrence par semaine)
 * - ONE_TIME         : constante — la tâche n'a qu'une seule occurrence à vie
 */
export function periodKeyFor(
  recurrence: string,
  now: Date = new Date(),
): string {
  const { year, month, day, dateKey } = localParts(now);

  switch (recurrence as Recurrence) {
    case "DAILY":
    case "WEEKDAYS":
      return dateKey;
    case "WEEKLY":
      return isoWeekKey(year, month, day);
    case "ONE_TIME":
      return "once";
    default:
      return dateKey;
  }
}

/**
 * La tâche est-elle proposée en ce moment ?
 * Seul WEEKDAYS peut répondre non: les autres récurrences restent proposées
 * jusqu'à ce que leur occurrence courante soit complétée.
 */
export function isDueNow(
  task: TaskRecurrenceInput,
  now: Date = new Date(),
): boolean {
  if ((task.recurrence as Recurrence) !== "WEEKDAYS") return true;

  const days = parseWeekdays(task.weekdays);
  if (days.length === 0) return false;

  return days.includes(localParts(now).weekday);
}

/** Résumé lisible de la récurrence, pour l'UI. */
export function describeRecurrence(task: TaskRecurrenceInput): string {
  const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  switch (task.recurrence as Recurrence) {
    case "DAILY":
      return "Tous les jours";
    case "WEEKDAYS": {
      const days = parseWeekdays(task.weekdays);
      if (days.length === 0) return "Aucun jour choisi";
      if (days.length === 7) return "Tous les jours";
      return days
        .slice()
        .sort((a, b) => a - b)
        .map((day) => labels[day])
        .join(", ");
    }
    case "WEEKLY":
      return "Une fois par semaine";
    case "ONE_TIME":
      return "Une seule fois";
    default:
      return "";
  }
}
