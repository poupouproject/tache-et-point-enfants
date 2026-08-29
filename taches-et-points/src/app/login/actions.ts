"use server";

import { redirect } from "next/navigation";

import { getSettings, unlockKiosk, verifyPin } from "@/lib/auth/session";
import {
  recordFailure,
  recordSuccess,
  retryMessage,
  secondsUntilRetry,
} from "@/lib/auth/throttle";

export type PinState = { error?: string };

/** Déverrouille le kiosque. */
export async function submitAccessPin(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const waiting = secondsUntilRetry("access");
  if (waiting > 0) return { error: retryMessage(waiting) };

  const pin = String(formData.get("pin") ?? "");

  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "Le NIP doit contenir de 4 à 8 chiffres." };
  }

  const settings = await getSettings();
  if (!settings) {
    return { error: "L'application n'est pas encore configurée." };
  }

  if (!(await verifyPin(pin, settings.accessPinHash))) {
    recordFailure("access");
    return { error: "NIP incorrect." };
  }

  recordSuccess("access");
  await unlockKiosk();
  redirect("/");
}
