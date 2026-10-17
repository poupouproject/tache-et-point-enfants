/**
 * Helpers de date conscients du fuseau horaire.
 *
 * Le conteneur tourne souvent en UTC, mais « aujourd'hui » doit être le jour
 * local de la famille — sinon une tâche confirmée à 20h le soir compterait
 * pour le lendemain. Tout passe donc par Intl avec un fuseau explicite, plutôt
 * que par l'heure locale du process.
 */

const DEFAULT_TIMEZONE = "America/Toronto";

/**
 * Le fuseau vient d'un champ libre des options de l'add-on. Un nom qu'Intl ne
 * reconnaît pas (« Montreal », « EST5 ») lèverait un RangeError au chargement
 * de ce module et ferait tomber toutes les pages: on retombe plutôt sur le
 * fuseau par défaut. run.sh fait la même vérification et l'annonce au journal.
 */
function resolveTimezone(candidate: string | undefined): string {
  if (!candidate) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export const APP_TIMEZONE = resolveTimezone(process.env.APP_TIMEZONE);

/** Parties calendaires d'un instant, dans le fuseau de la famille. */
export function localParts(date: Date = new Date(), timeZone = APP_TIMEZONE) {
  // 'en-CA' produit directement le format YYYY-MM-DD.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  return {
    year,
    month,
    day,
    /** YYYY-MM-DD dans le fuseau de la famille */
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    /** 0 = dimanche .. 6 = samedi */
    weekday: weekdayIndex(year, month, day),
  };
}

/**
 * Jour de la semaine d'une date calendaire, 0 = dimanche.
 * On reconstruit la date en UTC: le jour de semaine ne dépend que du calendrier,
 * pas de l'heure, donc c'est exact quel que soit le fuseau du process.
 */
function weekdayIndex(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Clé de semaine ISO (ex. « 2026-W35 ») pour une date calendaire.
 * Les semaines ISO commencent le lundi et la semaine 1 est celle qui contient
 * le premier jeudi de l'année.
 */
export function isoWeekKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  // On se déplace sur le jeudi de la semaine courante: son année est, par
  // définition, l'année ISO de la semaine.
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // 0 = lundi
  date.setUTCDate(date.getUTCDate() - dayOfWeek + 3);

  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayOfWeek = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayOfWeek + 3);

  const week =
    1 +
    Math.round(
      (date.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Décale une clé de date YYYY-MM-DD d'un nombre de jours. */
export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Convertit un instant en clé de date YYYY-MM-DD dans le fuseau famille. */
export function dateKeyOf(date: Date, timeZone = APP_TIMEZONE): string {
  return localParts(date, timeZone).dateKey;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-CA", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "long",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("fr-CA", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

export function formatDateTime(date: Date): string {
  return `${DATE_FORMATTER.format(date)} à ${TIME_FORMATTER.format(date)}`;
}

/** Libellé long du jour courant, ex. « vendredi 28 août ». */
export function todayLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
