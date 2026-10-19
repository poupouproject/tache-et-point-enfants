"use client";

import { Gift, Home, ListChecks, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; short?: string; icon: typeof Home }[] = [
  { href: "/parent", label: "Accueil", icon: Home },
  { href: "/parent/taches", label: "Tâches", icon: ListChecks },
  { href: "/parent/enfants", label: "Enfants", icon: Users },
  // « Récompenses » ne tient pas sous l'icône d'un onglet de téléphone.
  { href: "/parent/recompenses", label: "Récompenses", short: "Boutique", icon: Gift },
  { href: "/parent/reglages", label: "Réglages", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/parent" ? pathname === href : pathname.startsWith(href);
}

/**
 * Navigation de l'espace parents: une rangée de boutons en haut sur tablette et
 * ordinateur, une barre d'onglets fixée en bas sur téléphone — là où le pouce
 * l'atteint, comme dans une application.
 */
export function ParentNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="mb-6 hidden flex-wrap gap-2 sm:flex">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition-colors",
              isActive(pathname, item.href)
                ? "border-sky-500 bg-sky-500/15 text-white"
                : "border-hud-700 bg-hud-800 text-hud-200 hover:border-hud-600 hover:bg-hud-700 hover:text-white",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Espace parents"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-2 border-hud-700 bg-hud-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-[11px] font-bold transition-colors",
                active ? "text-sky-400" : "text-hud-400",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  active && "bg-sky-500/20",
                )}
              >
                <item.icon className="size-5" aria-hidden />
              </span>
              <span className="max-w-full truncate">{item.short ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
