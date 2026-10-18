"use client";

import { Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fait voler des pièces d'un point de l'écran vers un autre — de la tâche
 * touchée vers le solde de l'enfant. Les pièces sont posées sur <body>, hors
 * de la fenêtre modale qui se ferme pendant ce temps.
 *
 * Résout quand la dernière pièce est arrivée; tout de suite si l'appareil
 * demande moins d'animations.
 */
export async function flyCoins(
  from: DOMRect,
  to: DOMRect,
  count: number,
): Promise<void> {
  if (prefersReducedMotion()) return;

  const size = 34;
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const endX = to.left + to.width / 2 - size / 2;
  const endY = to.top + to.height / 2 - size / 2;

  const flights = Array.from({ length: Math.min(Math.max(count, 3), 10) }, (_, index) => {
    const coin = document.createElement("div");
    coin.className = "fly-coin";
    coin.style.width = coin.style.height = `${size}px`;
    document.body.appendChild(coin);

    // Chaque pièce part un peu de côté et monte avant de plonger vers le
    // solde: une gerbe plutôt qu'une file indienne.
    const spread = (index % 2 === 0 ? 1 : -1) * (20 + index * 9);
    const peakX = (startX + endX) / 2 + spread;
    const peakY = Math.min(startY, endY) - 90 - (index % 3) * 25;

    const animation = coin.animate(
      [
        { transform: `translate(${startX}px, ${startY}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${startX + spread / 2}px, ${startY - 30}px) scale(1.15)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${peakX}px, ${peakY}px) scale(1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${endX}px, ${endY}px) scale(0.55)`, opacity: 0.9 },
      ],
      {
        duration: 850,
        delay: index * 70,
        easing: "cubic-bezier(0.45, 0, 0.55, 1)",
        fill: "both",
      },
    );

    return animation.finished.finally(() => coin.remove());
  });

  await Promise.allSettled(flights);
}

/**
 * Solde qui « compte » jusqu'à sa nouvelle valeur.
 *
 * Tant que `hold` est vrai, l'ancien solde reste affiché: la page a déjà reçu
 * le nouveau solde du serveur, mais on attend que les pièces arrivent pour le
 * montrer monter.
 */
export function AnimatedBalance({
  value,
  hold,
  className,
}: {
  value: number;
  hold: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(0);
  const shownRef = useRef(value);

  useEffect(() => {
    if (hold || value === shownRef.current) return;

    const from = shownRef.current;
    shownRef.current = value;

    // Sans animation demandée, le décompte dure zéro: une seule image.
    const duration = prefersReducedMotion() ? 0 : 600;
    let started = 0;
    let frame = 0;

    const tick = (now: number) => {
      if (!started) {
        started = now;
        if (duration > 0) setBump((count) => count + 1);
      }
      const progress = duration ? Math.min((now - started) / duration, 1) : 1;
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, hold]);

  return (
    <span
      key={bump}
      className={cn(
        "inline-flex items-center gap-3 font-hud text-coin",
        bump > 0 && "animate-balance-bump",
        className,
      )}
    >
      <Coins className="size-10 shrink-0 sm:size-12" aria-hidden />
      <span className="tabular-nums">{shown}</span>
      <span className="sr-only">pièces</span>
    </span>
  );
}
