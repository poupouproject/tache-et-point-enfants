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
