import "server-only";

import { timingSafeEqual } from "node:crypto";

import { hashPin, verifyPin } from "@/lib/auth/pin-hash";
import { prisma } from "@/lib/prisma";

/**
 * NIP imposés de l'extérieur de l'app.
 *
 * Dans l'add-on, run.sh les lit dans les options Home Assistant (access_pin,
 * parent_pin) et les passe en ACCESS_PIN / PARENT_PIN; hors Home Assistant,
 * on pose directement ces variables. Un NIP imposé fait foi: l'app ne permet
 * plus de le changer. Le but premier est la récupération: un NIP oublié se
 * remet depuis la configuration de Home Assistant.
 */
export type PinKind = "access" | "parent";

const PIN_FORMAT = /^\d{4,8}$/;

function fromEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && PIN_FORMAT.test(value) ? value : null;
}

export function managedPins(): Record<PinKind, string | null> {
  const access = fromEnv("ACCESS_PIN");
  const parent = fromEnv("PARENT_PIN");
  // Deux NIP identiques laisseraient les enfants entrer dans l'espace parents:
  // le NIP parent imposé est alors ignoré (run.sh le signale au journal).
  return { access, parent: parent && parent !== access ? parent : null };
}

function samePin(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const HASH_FIELD = { access: "accessPinHash", parent: "parentPinHash" } as const;
const OTHER = { access: "parent", parent: "access" } as const;

type StoredHashes = { accessPinHash: string; parentPinHash: string };

/**
 * NIP imposés réellement appliqués.
 *
 * managedPins() ne voit que les options: si une seule est remplie, elle peut
 * être identique à l'autre NIP, choisi dans l'app — que seul son hash permet
 * de reconnaître. Un NIP parent imposé égal au NIP d'entrée de l'app
 * laisserait les enfants entrer dans l'espace parents: il est alors ignoré.
 */
export async function activeManagedPins(
  stored?: StoredHashes | null,
): Promise<Record<PinKind, string | null>> {
  const pins = managedPins();
  const settings = stored ?? (await prisma.appSettings.findUnique({ where: { id: 1 } }));
  if (!settings) return pins;

  for (const kind of ["access", "parent"] as const) {
    const value = pins[kind];
    const other = OTHER[kind];
    if (!value || pins[other]) continue;
    if (await verifyPin(value, settings[HASH_FIELD[other]])) {
      console.warn(
        `[taches-et-points] NIP ${kind === "parent" ? "parent" : "d'entrée"} de Home Assistant ignoré: identique à l'autre NIP de l'application`,
      );
      pins[kind] = null;
    }
  }
  return pins;
}

/**
 * Le NIP saisi est-il le bon? Compare au NIP imposé s'il y en a un, sinon au
 * hash enregistré dans l'app.
 *
 * Quand le NIP imposé est accepté, l'app enregistre aussi son hash: si
 * l'option est vidée plus tard, c'est ce NIP-là qui reste — pas l'ancien,
 * peut-être oublié, qu'on cherchait justement à remplacer.
 */
export async function checkPin(kind: PinKind, pin: string): Promise<boolean> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) return false;

  const stored = settings[HASH_FIELD[kind]];
  const managed = (await activeManagedPins(settings))[kind];

  if (!managed) return verifyPin(pin, stored);
  if (!samePin(pin, managed)) return false;

  if (!(await verifyPin(managed, stored))) {
    await prisma.appSettings.update({
      where: { id: 1 },
      data: { [HASH_FIELD[kind]]: await hashPin(managed) },
    });
  }
  return true;
}

/** Comme checkPin, sans effet: sert à empêcher deux NIP identiques. */
export async function matchesPin(
  kind: PinKind,
  pin: string,
  settings: StoredHashes,
): Promise<boolean> {
  const managed = (await activeManagedPins(settings))[kind];
  return managed ? samePin(pin, managed) : verifyPin(pin, settings[HASH_FIELD[kind]]);
}
