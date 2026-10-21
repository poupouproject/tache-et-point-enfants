import "server-only";

import { AVATARS, CHILD_COLOR_KEYS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { endOfLocalDay } from "@/lib/time";

export type ProfileResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "INVALID" | "NOT_ALLOWED" };

/**
 * Change l'avatar et la couleur d'un enfant, depuis sa page de profil.
 *
 * La page est ouverte aux enfants (kiosque déverrouillé, sans NIP parent):
 * seuls l'avatar et la couleur peuvent changer, pris dans les listes de
 * l'app, et seulement pour un enfant actif. Le prénom reste du ressort des
 * parents.
 */
export async function updateChildProfile(
  childId: string,
  avatar: string,
  color: string,
): Promise<ProfileResult> {
  const validAvatar = (AVATARS as readonly string[]).includes(avatar);
  const validColor = (CHILD_COLOR_KEYS as readonly string[]).includes(color);
  if (!validAvatar || !validColor) return { ok: false, reason: "INVALID" };

  // canEditProfile dans le filtre: le contrôle et l'écriture ne font qu'un,
  // un parent qui retire le droit au même moment ne peut pas être contourné.
  const updated = await prisma.child.updateMany({
    where: { id: childId, active: true, canEditProfile: true },
    data: { avatar, color },
  });
  if (updated.count === 1) return { ok: true };

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { active: true, canEditProfile: true },
  });
  return { ok: false, reason: child?.active && !child.canEditProfile ? "NOT_ALLOWED" : "NOT_FOUND" };
}

// --- Boutique bloquée --------------------------------------------------------

/**
 * Durées proposées aux parents. « Fin de la journée » s'arrête à minuit chez
 * la famille, quelle que soit l'heure où le blocage est posé.
 */
export const LOCK_DURATIONS = [
  { key: "30", label: "30 minutes" },
  { key: "60", label: "1 heure" },
  { key: "120", label: "2 heures" },
  { key: "240", label: "4 heures" },
  { key: "fin-journee", label: "Jusqu'à la fin de la journée" },
  { key: "1440", label: "24 heures" },
  { key: "4320", label: "3 jours" },
  { key: "10080", label: "1 semaine" },
] as const;

function lockEnd(key: string, now: Date): Date | null {
  if (!LOCK_DURATIONS.some((duration) => duration.key === key)) return null;
  if (key === "fin-journee") return endOfLocalDay(now);
  return new Date(now.getTime() + Number(key) * 60 * 1000);
}

export const LOCK_REASON_MAX = 120;

export type SpendLock = { until: Date; reason: string | null };

/** Le blocage en cours, ou null s'il n'y en a pas ou qu'il est échu. */
export function activeSpendLock(
  child: { spendLockedUntil: Date | null; spendLockReason: string | null },
  now: Date = new Date(),
): SpendLock | null {
  if (!child.spendLockedUntil || child.spendLockedUntil <= now) return null;
  return { until: child.spendLockedUntil, reason: child.spendLockReason };
}

export async function spendLockOf(childId: string, now: Date = new Date()): Promise<SpendLock | null> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { spendLockedUntil: true, spendLockReason: true },
  });
  return child ? activeSpendLock(child, now) : null;
}

/**
 * Bloque la boutique d'un enfant (récompenses et argent) pour une durée prise
 * dans LOCK_DURATIONS. Gagner des pièces reste possible: c'est une
 * conséquence, pas une punition de l'effort. La raison est montrée à l'enfant.
 * Le blocage se lève tout seul à l'échéance: rien à nettoyer.
 */
export async function lockSpending(
  childId: string,
  duration: string,
  reason: string,
  now: Date = new Date(),
): Promise<boolean> {
  const until = lockEnd(duration, now);
  if (!until) return false;
  const cleanReason = reason.trim().slice(0, LOCK_REASON_MAX) || null;

  const updated = await prisma.child.updateMany({
    where: { id: childId },
    data: {
      spendLockedUntil: until,
      spendLockReason: cleanReason,
    },
  });
  return updated.count === 1;
}

export async function unlockSpending(childId: string): Promise<boolean> {
  const updated = await prisma.child.updateMany({
    where: { id: childId },
    data: { spendLockedUntil: null, spendLockReason: null },
  });
  return updated.count === 1;
}

/** Un parent permet ou retire à un enfant le droit de changer sa carte. */
export async function setProfileEditable(childId: string, allowed: boolean): Promise<boolean> {
  const updated = await prisma.child.updateMany({
    where: { id: childId },
    data: { canEditProfile: allowed },
  });
  return updated.count === 1;
}
