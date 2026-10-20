import "server-only";

import { AVATARS, CHILD_COLOR_KEYS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type ProfileResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "INVALID" };

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

  const updated = await prisma.child.updateMany({
    where: { id: childId, active: true },
    data: { avatar, color },
  });

  return updated.count === 1 ? { ok: true } : { ok: false, reason: "NOT_FOUND" };
}

// --- Boutique bloquée --------------------------------------------------------

/** Durées proposées aux parents, en minutes. */
export const LOCK_DURATIONS = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 heure" },
  { minutes: 120, label: "2 heures" },
  { minutes: 240, label: "4 heures" },
  { minutes: 24 * 60, label: "1 jour" },
  { minutes: 3 * 24 * 60, label: "3 jours" },
  { minutes: 7 * 24 * 60, label: "1 semaine" },
] as const;

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
  minutes: number,
  reason: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!LOCK_DURATIONS.some((duration) => duration.minutes === minutes)) return false;
  const cleanReason = reason.trim().slice(0, LOCK_REASON_MAX) || null;

  const updated = await prisma.child.updateMany({
    where: { id: childId },
    data: {
      spendLockedUntil: new Date(now.getTime() + minutes * 60 * 1000),
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
