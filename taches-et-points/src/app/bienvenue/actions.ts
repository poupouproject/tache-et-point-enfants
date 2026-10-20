"use server";

import { redirect } from "next/navigation";

import { managedPins } from "@/lib/auth/pins";
import { hashPin, unlockKiosk } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type SetupState = { error?: string };

/**
 * Première configuration. Ne peut s'exécuter qu'une fois: si les réglages
 * existent déjà, l'appel est refusé — sinon n'importe qui pourrait réinitialiser
 * les NIP en rejouant cette action par POST direct.
 */
export async function completeSetup(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (existing) return { error: "L'application est déjà configurée." };

  // Un NIP imposé par Home Assistant n'est pas demandé dans le formulaire.
  const managed = managedPins();
  const accessPin = managed.access ?? String(formData.get("accessPin") ?? "");
  const parentPin = managed.parent ?? String(formData.get("parentPin") ?? "");

  if (!/^\d{4,8}$/.test(accessPin) || !/^\d{4,8}$/.test(parentPin)) {
    return { error: "Chaque NIP doit contenir de 4 à 8 chiffres." };
  }

  if (accessPin === parentPin) {
    return {
      error: "Les deux NIP doivent être différents, sinon les enfants pourraient entrer dans l'espace parents.",
    };
  }

  await prisma.appSettings.create({
    data: {
      id: 1,
      accessPinHash: await hashPin(accessPin),
      parentPinHash: await hashPin(parentPin),
      pointsPerDollar: 100,
    },
  });

  await unlockKiosk();
  redirect("/parent/deverrouiller");
}
