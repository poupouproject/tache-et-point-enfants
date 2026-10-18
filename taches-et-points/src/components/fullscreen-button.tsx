"use client";

import { Maximize, Minimize } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

const noSubscription = () => () => {};

function canGoFullscreen(): boolean {
  const installed = window.matchMedia(
    "(display-mode: fullscreen), (display-mode: standalone)",
  ).matches;
  return document.fullscreenEnabled && !installed;
}

/**
 * Bouton plein écran, pour une tablette posée au mur.
 *
 * Installée comme application, l'app s'ouvre déjà en plein écran (voir le
 * manifeste). Ouverte dans un onglet, elle passe par l'API Fullscreen, qui
 * exige un geste de l'utilisateur: d'où un bouton plutôt qu'un passage
 * automatique. Le bouton disparaît là où l'API n'existe pas (iPhone) et quand
 * l'app tourne déjà comme application installée.
 */
export function FullscreenButton() {
  const supported = useSyncExternalStore(noSubscription, canGoFullscreen, () => false);
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() =>
        active
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen({ navigationUI: "hide" })
      }
      className="btn-secondary px-4 py-3 text-sm"
      aria-label={active ? "Quitter le plein écran" : "Plein écran"}
    >
      {active ? <Minimize className="size-5" aria-hidden /> : <Maximize className="size-5" aria-hidden />}
    </button>
  );
}
