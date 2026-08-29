import { Settings2 } from "lucide-react";
import Link from "next/link";

import { ChildCard } from "@/components/child-card";
import { requireUnlocked } from "@/lib/auth/session";
import { buildBoard } from "@/lib/tasks/service";
import { todayLabel } from "@/lib/time";

// Le tableau change à chaque confirmation: rien à mettre en cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireUnlocked();

  const board = await buildBoard();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud text-xl text-white sm:text-2xl">
            Quêtes &amp; Pièces
          </h1>
          <p className="mt-2 text-sm font-bold capitalize text-hud-400">
            {todayLabel()}
          </p>
        </div>

        <Link href="/parent" className="btn-secondary py-3 text-sm">
          <Settings2 className="size-5" aria-hidden />
          Parents
        </Link>
      </header>

      {board.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-hud text-base text-white">Aucun joueur</p>
          <p className="mx-auto mt-4 max-w-md text-sm text-hud-400">
            Ajoutez les enfants depuis l&apos;espace parents pour commencer à
            distribuer des quêtes.
          </p>
          <Link href="/parent" className="btn-primary mt-6">
            Ouvrir l&apos;espace parents
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {board.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </main>
  );
}
