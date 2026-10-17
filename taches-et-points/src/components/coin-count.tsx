import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compteur de pièces, façon HUD de jeu. Les points ne sont jamais présentés
 * comme un nombre nu: c'est une monnaie, avec son icône.
 */
export function CoinCount({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: { text: "text-sm", icon: "size-4" },
    md: { text: "text-xl", icon: "size-6" },
    lg: { text: "text-3xl sm:text-4xl", icon: "size-8 sm:size-10" },
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-hud text-coin",
        sizes.text,
        className,
      )}
    >
      <Coins className={cn(sizes.icon, "shrink-0")} aria-hidden />
      <span className="tabular-nums">{value}</span>
      <span className="sr-only">pièces</span>
    </span>
  );
}
