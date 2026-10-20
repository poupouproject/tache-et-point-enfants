"use server";

import { redirect } from "next/navigation";

import { checkPin } from "@/lib/auth/pins";
import { getSettings, unlockKiosk } from "@/lib/auth/session";
import {
  recordSuccess,
  reserveAttempt,
  retryMessage,
} from "@/lib/auth/throttle";

export type PinState = { error?: string };

/** Déverrouille le kiosque. */
export async function submitAccessPin(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const pin = String(formData.get("pin") ?? "");

  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "Le NIP doit contenir de 4 à 8 chiffres." };
  }

  // La tentative est comptée avant la comparaison, pas après: voir throttle.ts.
  const waiting = reserveAttempt("access");
  if (waiting > 0) return { error: retryMessage(waiting) };

  const settings = await getSettings();
  if (!settings) {
    return { error: "L'application n'est pas encore configurée." };
  }

  if (!(await checkPin("access", pin))) {
    return { error: "NIP incorrect." };
  }

  recordSuccess("access");
  await unlockKiosk();
  redirect("/");
}
