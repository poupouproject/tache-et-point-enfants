"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Numéro de version en bas de chaque page, vers la page « Nouveautés ».
 * Dans l'espace parents sur téléphone, la barre d'onglets fixe couvre le bas
 * de l'écran: le pied de page remonte au-dessus.
 */
export function VersionFooter() {
  const pathname = usePathname();
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  if (!version || pathname === "/nouveautes") return null;

  return (
    <footer
      className={cn(
        "px-4 pt-2 pb-4 text-center text-xs text-hud-400",
        pathname.startsWith("/parent") && "mb-24 sm:mb-0",
      )}
    >
      <Link href="/nouveautes" className="transition-colors hover:text-white">
        Quêtes &amp; Pièces {version} · Nouveautés
      </Link>
    </footer>
  );
}
