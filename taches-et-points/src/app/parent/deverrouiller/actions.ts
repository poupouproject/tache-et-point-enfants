"use server";

import { redirect } from "next/navigation";

import {
  enterParentMode,
  getSettings,
  requireUnlocked,
} from "@/lib/auth/session";
import { checkPin } from "@/lib/auth/pins";
import {
  recordSuccess,
  reserveAttempt,
  retryMessage,
} from "@/lib/auth/throttle";

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

  // La tentative est comptée avant la comparaison, pas après: voir throttle.ts.
  const waiting = reserveAttempt("parent");
  if (waiting > 0) return { error: retryMessage(waiting) };

  const settings = await getSettings();
  if (!settings) return { error: "Application non configurée." };

  if (!(await checkPin("parent", pin))) {
    return { error: "NIP incorrect." };
  }

  recordSuccess("parent");
  await enterParentMode();
  redirect("/parent");
}
