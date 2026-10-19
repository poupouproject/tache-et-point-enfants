import { LogOut } from "lucide-react";

import { isParentMode } from "@/lib/auth/session";

import { leaveParentMode } from "./actions";
import { ParentNav } from "./parent-nav";

export default async function ParentLayout({
  children,
}: LayoutProps<"/parent">) {
  // L'écran de déverrouillage vit sous /parent mais ne doit pas afficher la
  // navigation: on ne l'enveloppe que lorsque le mode parent est déjà actif.
  if (!(await isParentMode())) return children;

  return (
    // Sur téléphone, la marge du bas laisse la place à la barre d'onglets.
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 pb-28 sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-hud text-base text-white sm:text-lg">Espace parents</h1>

        <form action={leaveParentMode}>
          <button type="submit" className="btn-secondary px-4 py-2.5 text-sm">
            <LogOut className="size-4" aria-hidden />
            Quitter
          </button>
        </form>
      </header>

      <ParentNav />

      {children}
    </div>
  );
}
