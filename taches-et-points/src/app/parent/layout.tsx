import {
  Gift,
  Home,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

import { isParentMode } from "@/lib/auth/session";

import { leaveParentMode } from "./actions";

const NAV = [
  { href: "/parent", label: "Accueil", icon: Home },
  { href: "/parent/taches", label: "Tâches", icon: ListChecks },
  { href: "/parent/enfants", label: "Enfants", icon: Users },
  { href: "/parent/recompenses", label: "Récompenses", icon: Gift },
  { href: "/parent/reglages", label: "Réglages", icon: Settings },
];

export default async function ParentLayout({
  children,
}: LayoutProps<"/parent">) {
  // L'écran de déverrouillage vit sous /parent mais ne doit pas afficher la
  // navigation: on ne l'enveloppe que lorsque le mode parent est déjà actif.
  if (!(await isParentMode())) return children;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-hud text-lg text-white">Espace parents</h1>

        <form action={leaveParentMode}>
          <button type="submit" className="btn-secondary py-3 text-sm">
            <LogOut className="size-4" aria-hidden />
            Quitter
          </button>
        </form>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-hud-700 bg-hud-800 px-4 py-2.5 text-sm font-bold text-hud-200 transition-colors hover:border-hud-600 hover:bg-hud-700 hover:text-white"
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
