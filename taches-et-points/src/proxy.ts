import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Contrôle optimiste: on redirige vers l'écran de NIP quand le cookie de
 * session est absent, pour éviter un aller-retour inutile.
 *
 * Ce n'est PAS la sécurité de l'app: la signature du cookie n'est pas vérifiée
 * ici. La vraie vérification est faite par requireUnlocked()/requireParent()
 * dans chaque page et chaque Server Action.
 */
/** Chemins accessibles sans session (écran de NIP et première configuration). */
const PUBLIC_PATHS = ["/login", "/bienvenue"];

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // On laisse passer les assets et les routes internes de Next, et le
  // manifeste: le navigateur le télécharge sans cookie pour proposer
  // d'installer l'app, avant toute saisie de NIP.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|ico)$).*)",
  ],
};
