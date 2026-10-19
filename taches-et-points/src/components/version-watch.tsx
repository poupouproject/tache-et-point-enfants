"use client";

import { useEffect } from "react";

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Recharge la page quand une nouvelle version de l'app a été installée.
 *
 * La tablette du salon reste ouverte des jours entiers. Après une mise à jour,
 * sa page garde l'ancien code, dont les actions (confirmer une tâche, acheter)
 * ne sont plus reconnues par le serveur: le premier tap de la journée tombait
 * sur une page d'erreur. On compare donc l'identifiant de build de la page à
 * celui du serveur, au retour à l'écran et toutes les cinq minutes.
 */
export function VersionWatch() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID;
    let reloading = false;

    async function check() {
      if (reloading || document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/version", { cache: "no-store" });
        if (!response.ok) return;
        const { build } = (await response.json()) as { build?: string };
        if (build && mine && build !== mine) {
          reloading = true;
          window.location.reload();
        }
      } catch {
        // Serveur injoignable (redémarrage en cours): on réessaiera.
      }
    }

    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, []);

  return null;
}
