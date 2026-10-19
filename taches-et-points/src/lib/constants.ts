/**
 * Valeurs d'énumération de l'app.
 *
 * SQLite ne supporte pas les `enum` Prisma: les colonnes correspondantes sont
 * des String et c'est ce fichier qui fait autorité sur les valeurs permises.
 */

/**
 * FAMILY: une seule occurrence pour toute la famille, au premier arrivé.
 * INDIVIDUAL: assignée à un enfant.
 * EACH: chaque enfant a la sienne (faire son lit), sans en créer une copie par
 * enfant.
 */
export const TASK_TYPES = ["FAMILY", "INDIVIDUAL", "EACH"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const RECURRENCES = ["DAILY", "WEEKDAYS", "WEEKLY", "ONE_TIME"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const TRANSACTION_TYPES = [
  "EARNED",
  "SPENT_REWARD",
  "CONVERTED_MONEY",
  "MANUAL_ADJUST",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_SOURCES = [
  "TASK",
  "MANUAL",
  "REWARD",
  "CONVERSION",
] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const ACTORS = ["CHILD", "PARENT"] as const;
export type Actor = (typeof ACTORS)[number];

export const REDEMPTION_STATUSES = ["PENDING", "FULFILLED", "REJECTED"] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export const CONVERSION_STATUSES = ["PENDING", "PAID", "REJECTED"] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

/**
 * Couleurs d'accent assignables à un enfant. Les classes Tailwind sont écrites
 * en toutes lettres (pas d'interpolation) pour que le compilateur les détecte.
 */
export const CHILD_COLORS = {
  red: {
    label: "Rouge",
    ring: "ring-rose-500",
    border: "border-rose-500",
    bg: "bg-rose-500",
    text: "text-rose-400",
    glow: "shadow-rose-500/40",
    gradient: "from-rose-500 to-rose-700",
  },
  blue: {
    label: "Bleu",
    ring: "ring-sky-500",
    border: "border-sky-500",
    bg: "bg-sky-500",
    text: "text-sky-400",
    glow: "shadow-sky-500/40",
    gradient: "from-sky-500 to-sky-700",
  },
  green: {
    label: "Vert",
    ring: "ring-emerald-500",
    border: "border-emerald-500",
    bg: "bg-emerald-500",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/40",
    gradient: "from-emerald-500 to-emerald-700",
  },
  yellow: {
    label: "Jaune",
    ring: "ring-amber-400",
    border: "border-amber-400",
    bg: "bg-amber-400",
    text: "text-amber-300",
    glow: "shadow-amber-400/40",
    gradient: "from-amber-400 to-amber-600",
  },
  purple: {
    label: "Violet",
    ring: "ring-violet-500",
    border: "border-violet-500",
    bg: "bg-violet-500",
    text: "text-violet-400",
    glow: "shadow-violet-500/40",
    gradient: "from-violet-500 to-violet-700",
  },
  orange: {
    label: "Orange",
    ring: "ring-orange-500",
    border: "border-orange-500",
    bg: "bg-orange-500",
    text: "text-orange-400",
    glow: "shadow-orange-500/40",
    gradient: "from-orange-500 to-orange-700",
  },
} as const;

export type ChildColor = keyof typeof CHILD_COLORS;
export const CHILD_COLOR_KEYS = Object.keys(CHILD_COLORS) as ChildColor[];

export function childColor(key: string) {
  return CHILD_COLORS[key as ChildColor] ?? CHILD_COLORS.red;
}

/** Jours de la semaine, index 0 = dimanche (aligné sur Date.getDay()). */
export const WEEKDAY_LABELS = [
  "Dim",
  "Lun",
  "Mar",
  "Mer",
  "Jeu",
  "Ven",
  "Sam",
] as const;

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  DAILY: "Tous les jours",
  WEEKDAYS: "Certains jours",
  WEEKLY: "Une fois par semaine",
  ONE_TIME: "Une seule fois",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FAMILY: "Familiale",
  INDIVIDUAL: "Individuelle",
  EACH: "Chaque enfant",
};

/**
 * Avatars proposés. L'enfant choisit le sien sur sa page de profil: la liste
 * fait aussi autorité côté serveur, pour qu'un POST direct ne puisse pas
 * glisser n'importe quel texte à la place d'un avatar.
 */
export const AVATARS = [
  "🦊", "🐢", "🐼", "🦁", "🐸", "🦄", "🐧", "🐙",
  "🦖", "🐨", "🐰", "🦉", "🐯", "🐶", "🐱", "🐵",
  "🦈", "🐲", "🦋", "🐝", "🚀", "⚽", "🎮", "🎨",
] as const;
