"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY_MS = 20_000;
const IDLE_MS = 15_000;

/**
 * Tient le tableau de bord à jour sur une tablette restée ouverte: une
 * boutique fermée depuis le téléphone d'un parent, une tâche prise par un
 * frère, un blocage échu.
 *
 * router.refresh() ne recharge pas la page: il redemande au serveur les
 * données du tableau et React n'applique que les différences. L'enfant reste
 * où il est. On s'abstient malgré tout pendant qu'une fenêtre est ouverte
 * (tâches, boutique, historique) et juste après un toucher, pour que rien ne
 * bouge sous son doigt; le prochain passage rattrape.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastTouch = 0;
    const touched = () => {
      lastTouch = Date.now();
    };

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (document.querySelector("dialog[open]")) return;
      if (Date.now() - lastTouch < IDLE_MS) return;
      router.refresh();
    };

    const onVisible = () => {
      // Écran rallumé: personne n'a encore touché, on rattrape tout de suite.
      if (document.visibilityState === "visible") {
        lastTouch = 0;
        refresh();
      }
    };

    const timer = setInterval(refresh, EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pointerdown", touched, { passive: true });
    window.addEventListener("keydown", touched);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", touched);
      window.removeEventListener("keydown", touched);
    };
  }, [router]);

  return null;
}
