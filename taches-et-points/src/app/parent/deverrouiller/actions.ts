"use server";

import { redirect } from "next/navigation";

import {
  enterParentMode,
  getSettings,
  requireUnlocked,
  verifyPin,
} from "@/lib/auth/session";
import {
  recordFailure,
  recordSuccess,
  retryMessage,
  secondsUntilRetry,
} from "@/lib/auth/throttle";

export type PinState = { error?: string };

export async function submitParentPin(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  await requireUnlocked();

  const waiting = secondsUntilRetry("parent");
  if (waiting > 0) return { error: retryMessage(waiting) };

  const pin = String(formData.get("pin") ?? "");

  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "Le NIP doit contenir de 4 à 8 chiffres." };
  }

  const settings = await getSettings();
  if (!settings) return { error: "Application non configurée." };

  if (!(await verifyPin(pin, settings.parentPinHash))) {
    recordFailure("parent");
    return { error: "NIP incorrect." };
  }

  recordSuccess("parent");
  await enterParentMode();
  redirect("/parent");
}
