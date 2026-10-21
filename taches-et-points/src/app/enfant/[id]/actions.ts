"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUnlocked } from "@/lib/auth/session";
import { scheduleHaSync } from "@/lib/ha/sync";
import { updateChildProfile, type SpendLock } from "@/lib/children";
import { untilPhrase } from "@/lib/time";
import { requestConversion, requestReward } from "@/lib/rewards/service";

export type ProfileState = { error?: string };

/** L'enfant change son avatar et sa couleur, puis retourne au tableau. */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  await requireUnlocked();

  const result = await updateChildProfile(
    String(formData.get("childId") ?? ""),
    String(formData.get("avatar") ?? ""),
    String(formData.get("color") ?? ""),
  );

  if (!result.ok) {
    return {
      error:
        result.reason === "INVALID"
          ? "Choisis un avatar et une couleur dans la liste."
          : result.reason === "NOT_ALLOWED"
            ? "Un parent a bloqué les changements de ta carte."
            : "Cette carte n'existe plus.",
    };
  }

  revalidatePath("/");
  scheduleHaSync();
  redirect("/");
}

function lockedMessage(lock: SpendLock): string {
  const until = untilPhrase(lock.until);
  return lock.reason
    ? `Boutique fermée ${until} : ${lock.reason}`
    : `Boutique fermée ${until}.`;
}

export type ShopState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

export async function buyReward(
  _prev: ShopState,
  formData: FormData,
): Promise<ShopState> {
  await requireUnlocked();

  const childId = String(formData.get("childId") ?? "");
  const rewardId = String(formData.get("rewardId") ?? "");

  const result = await requestReward(childId, rewardId);
  revalidatePath("/");
  scheduleHaSync();

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "LOCKED"
          ? lockedMessage(result.lock)
          : result.reason === "INSUFFICIENT_FUNDS"
            ? "Pas assez de pièces !"
            : "Cette récompense n'est plus disponible.",
    };
  }

  return {
    status: "done",
    message: "Demande envoyée ! Un parent doit la confirmer.",
  };
}

export async function convertToMoney(
  _prev: ShopState,
  formData: FormData,
): Promise<ShopState> {
  await requireUnlocked();

  const childId = String(formData.get("childId") ?? "");
  const points = Number(formData.get("points") ?? 0);

  if (!Number.isInteger(points) || points <= 0) {
    return { status: "error", message: "Nombre de pièces invalide." };
  }

  const result = await requestConversion(childId, points);
  revalidatePath("/");
  scheduleHaSync();

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "LOCKED"
          ? lockedMessage(result.lock)
          : result.reason === "INSUFFICIENT_FUNDS"
            ? "Pas assez de pièces !"
            : "Conversion impossible.",
    };
  }

  return {
    status: "done",
    message: "Demande envoyée ! Un parent doit remettre l'argent.",
  };
}
