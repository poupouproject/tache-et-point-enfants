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

export function formatTime(date: Date): string {
  return TIME_FORMATTER.format(date);
}

/**
 * Titre d'une journée d'historique: « Aujourd'hui », « Hier », sinon
 * « lundi 19 octobre ». La clé YYYY-MM-DD est déjà dans le fuseau de la
 * famille: on la formate en UTC pour ne pas la décaler une seconde fois.
 */
export function dayLabel(dateKey: string, now: Date = new Date()): string {
  const today = dateKeyOf(now);
  if (dateKey === today) return "Aujourd'hui";
  if (dateKey === shiftDateKey(today, -1)) return "Hier";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** Écart entre l'heure locale de la famille et UTC à cet instant, en ms. */
function offsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Minuit (début de journée) d'une date de la famille, comme instant UTC.
 * L'écart avec UTC change avec l'heure d'été: on le mesure autour de la date
 * visée, en deux passes pour les jours de changement d'heure.
 */
export function startOfLocalDay(dateKey: string, timeZone = APP_TIMEZONE): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, day);
  let instant = wall;
  for (let pass = 0; pass < 2; pass++) {
    instant = wall - offsetMs(new Date(instant), timeZone);
  }
  return new Date(instant);
}

/** Minuit à la fin de la journée en cours, chez la famille. */
export function endOfLocalDay(now: Date = new Date()): Date {
  return startOfLocalDay(shiftDateKey(dateKeyOf(now), 1));
}

/**
 * Échéance lisible par un enfant: « 18 h 30 » aujourd'hui, « demain à 7 h 00 »,
 * sinon « 23 octobre à 18 h 30 ».
 */
export function formatUntil(date: Date, now: Date = new Date()): string {
  const day = dateKeyOf(date);
  const today = dateKeyOf(now);
  // « jusqu'à minuit » plutôt que « jusqu'à demain à 00 h 00 ».
  if (day === shiftDateKey(today, 1) && date.getTime() === startOfLocalDay(day).getTime()) {
    return "minuit";
  }
  if (day === today) return TIME_FORMATTER.format(date);
  if (day === shiftDateKey(today, 1)) return `demain à ${TIME_FORMATTER.format(date)}`;
  return formatDateTime(date);
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
