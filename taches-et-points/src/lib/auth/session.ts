import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "tpe_session";

/** Durée de vie de la session kiosque: assez longue pour ne pas ré-entrer le PIN tous les jours. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Le mode parent expire vite: c'est un déverrouillage ponctuel, pas un état permanent. */
const PARENT_MODE_SECONDS = 60 * 30;

export type SessionPayload = {
  /** L'accès kiosque a été déverrouillé */
  unlocked: true;
  /** Timestamp (secondes epoch) jusqu'auquel le mode parent est actif */
  parentUntil?: number;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (32 caractères minimum). " +
        "Définissez-le dans .env en développement; l'add-on le génère au premier démarrage.",
    );
  }

  return new TextEncoder().encode(secret);
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

async function readSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.unlocked !== true) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

async function writeCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    // L'add-on est servi en HTTP sur le réseau local: exiger `secure` rendrait
    // la connexion impossible. Le PIN protège l'accès, pas le transport.
    secure: false,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function currentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

/** Le kiosque est-il déverrouillé ? */
export async function isUnlocked(): Promise<boolean> {
  return (await currentSession()) !== null;
}

/** Le mode parent est-il actif (et non expiré) ? */
export async function isParentMode(): Promise<boolean> {
  const session = await currentSession();
  if (!session?.parentUntil) return false;
  return session.parentUntil > Math.floor(Date.now() / 1000);
}

/** Ouvre la session kiosque. */
export async function unlockKiosk() {
  await writeCookie({ unlocked: true });
}

/** Élève la session courante en mode parent, pour une durée limitée. */
export async function enterParentMode() {
  await writeCookie({
    unlocked: true,
    parentUntil: Math.floor(Date.now() / 1000) + PARENT_MODE_SECONDS,
  });
}

/**
 * Quitte le mode parent sans fermer le kiosque.
 *
 * On ne réécrit le cookie que s'il en existait déjà un valide: écrire
 * inconditionnellement reviendrait à distribuer une session déverrouillée à
 * qui appelle cette fonction sans en avoir une, c'est-à-dire à contourner le
 * NIP d'entrée.
 */
export async function exitParentMode() {
  if (!(await currentSession())) return;
  await writeCookie({ unlocked: true });
}

/** Ferme complètement la session. */
export async function lockKiosk() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// --- Gardes ----------------------------------------------------------------

/**
 * À appeler au début de chaque page et de chaque Server Action du kiosque.
 * Les Server Actions sont joignables par POST direct: le contrôle dans l'UI
 * ne suffit pas, il doit être refait côté serveur à chaque appel.
 */
export async function requireUnlocked() {
  if (!(await isUnlocked())) redirect("/login");
}

/** Idem, pour tout ce qui touche au mode parent. */
export async function requireParent() {
  if (!(await isUnlocked())) redirect("/login");
  if (!(await isParentMode())) redirect("/parent/deverrouiller");
}

// --- PIN -------------------------------------------------------------------

// bcryptjs est du JavaScript pur: sa variante synchrone monopolise la boucle
// d'événements pendant tout le calcul, ce qui fige le serveur à chaque essai.
export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Réglages de l'app. La ligne est un singleton (id = 1) créée par le seed;
 * on renvoie null si l'app n'a pas encore été configurée.
 */
export async function getSettings() {
  return prisma.appSettings.findUnique({ where: { id: 1 } });
}
