"use server";

import { redirect } from "next/navigation";

import { getSettings, unlockKiosk, verifyPin } from "@/lib/auth/session";

export type PinState = { error?: string };

/**
 * Déverrouille le kiosque. Un délai constant en cas d'échec évite de
 * transformer le formulaire en oracle de temps de réponse.
 */
export async function submitAccessPin(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const pin = String(formData.get("pin") ?? "");

  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "Le NIP doit contenir de 4 à 8 chiffres." };
  }

  const settings = await getSettings();
  if (!settings) {
    return { error: "L'application n'est pas encore configurée." };
  }

  if (!verifyPin(pin, settings.accessPinHash)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "NIP incorrect." };
  }

  await unlockKiosk();
  redirect("/");
}
