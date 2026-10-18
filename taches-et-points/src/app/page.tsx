import { Settings2, Users } from "lucide-react";
import Link from "next/link";

import { ChildCard } from "@/components/child-card";
import { FullscreenButton } from "@/components/fullscreen-button";
import { requireUnlocked } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buildBoard, familyRemaining } from "@/lib/tasks/service";
import { formatDateTime, todayLabel } from "@/lib/time";

// Le tableau change à chaque confirmation: rien à mettre en cache.
export const dynamic = "force-dynamic";

/** Combien de lignes d'historique on charge par enfant pour sa fenêtre. */
const HISTORY_LENGTH = 40;

export default async function DashboardPage() {
  await requireUnlocked();

  const [board, settings, rewards] = await Promise.all([
    buildBoard(),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
    prisma.reward.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { costPoints: "asc" }],
      select: { id: true, name: true, description: true, icon: true, costPoints: true },
    }),
  ]);

  // L'historique de chaque carte est préparé ici, dates comprises: le fuseau
  // de la famille n'est connu que du serveur.
  const histories = await Promise.all(
    board.map((child) =>
      prisma.transaction.findMany({
        where: { childId: child.id },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LENGTH,
      }),
    ),
  );

  const pointsPerDollar = settings?.pointsPerDollar ?? 100;
  const familyLeft = familyRemaining(board);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud text-xl text-white sm:text-2xl">Quêtes &amp; Pièces</h1>
          <p className="mt-2 text-sm font-bold capitalize text-hud-400">{todayLabel()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {board.length > 0 && (
            <p
              className={
                familyLeft > 0
                  ? "chip bg-sky-500/15 py-2 text-sm text-sky-300"
                  : "chip bg-emerald-500/15 py-2 text-sm text-emerald-300"
              }
            >
              <Users className="size-4" aria-hidden />
              {familyLeft > 0
                ? `${familyLeft} tâche${familyLeft > 1 ? "s" : ""} au choix pour la famille`
                : "Toutes les tâches de la famille sont faites"}
            </p>
          )}
          <FullscreenButton />
          <Link href="/parent" className="btn-secondary py-3 text-sm">
            <Settings2 className="size-5" aria-hidden />
            Parents
          </Link>
        </div>
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
        // Autant de colonnes que l'écran en accepte: trois cartes côte à côte
        // sur une tablette à l'horizontale, deux puis une à la verticale.
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))] sm:gap-5">
          {board.map((child, index) => (
            <ChildCard
              key={child.id}
              child={child}
              rewards={rewards}
              pointsPerDollar={pointsPerDollar}
              history={histories[index].map((entry) => ({
                id: entry.id,
                description: entry.description,
                points: entry.points,
                when: formatDateTime(entry.createdAt),
                byParent: entry.createdBy === "PARENT",
              }))}
            />
          ))}
        </div>
      )}
    </main>
  );
}
