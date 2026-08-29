"use server";

import { redirect } from "next/navigation";

import {
  enterParentMode,
  getSettings,
  requireUnlocked,
  verifyPin,
} from "@/lib/auth/session";

export type PinState = { error?: string };

export async function submitParentPin(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  await requireUnlocked();

  const pin = String(formData.get("pin") ?? "");

  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "Le NIP doit contenir de 4 à 8 chiffres." };
  }

  const settings = await getSettings();
  if (!settings) return { error: "Application non configurée." };

  if (!verifyPin(pin, settings.parentPinHash)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "NIP incorrect." };
  }

  await enterParentMode();
  redirect("/parent");
}
