"use server";

import { revalidatePath } from "next/cache";

import { requireUnlocked } from "@/lib/auth/session";
import { requestConversion, requestReward } from "@/lib/rewards/service";

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
  revalidatePath(`/enfant/${childId}`);
  revalidatePath("/");

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "INSUFFICIENT_FUNDS"
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
  revalidatePath(`/enfant/${childId}`);
  revalidatePath("/");

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "INSUFFICIENT_FUNDS"
          ? "Pas assez de pièces !"
          : "Conversion impossible.",
    };
  }

  return {
    status: "done",
    message: "Demande envoyée ! Un parent doit remettre l'argent.",
  };
}
