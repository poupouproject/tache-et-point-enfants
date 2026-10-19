import { Eye, EyeOff, Pencil } from "lucide-react";
import Link from "next/link";

import { CoinCount } from "@/components/coin-count";
import { TaskIcon } from "@/components/icons";
import { RewardForm } from "@/components/parent/reward-form";
import { requireParent } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { toggleReward } from "../actions";

export const dynamic = "force-dynamic";

const ACTION =
  "inline-flex size-11 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors";

export default async function ParentRewardsPage() {
  await requireParent();

  const rewards = await prisma.reward.findMany({
    orderBy: [{ active: "desc" }, { costPoints: "asc" }],
  });

  return (
    // min-w-0 sur les colonnes: sans lui, un nom long empêche la colonne de
    // rétrécir et la carte déborde de l'écran du téléphone.
    <main className="grid gap-5 lg:grid-cols-2">
      <section className="min-w-0 space-y-3">
        <h2 className="font-hud text-base text-white">Récompenses</h2>

        {rewards.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="text-sm font-bold text-hud-400">
              Aucune récompense pour l&apos;instant.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rewards.map((reward) => (
              <li
                key={reward.id}
                className={cn(
                  "panel flex min-w-0 items-center gap-3 p-3 sm:p-4",
                  !reward.active && "opacity-50",
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500">
                  <TaskIcon name={reward.icon} className="size-6 text-white" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-bold break-words text-white">
                    {reward.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-hud-400">
                    <CoinCount value={reward.costPoints} size="sm" />
                    {!reward.active && <span className="font-bold">· retirée</span>}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/parent/recompenses/${reward.id}`}
                    className={cn(ACTION, "hover:border-sky-500 hover:text-sky-400")}
                    aria-label={`Modifier ${reward.name}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>

                  <form action={toggleReward}>
                    <input type="hidden" name="id" value={reward.id} />
                    <button
                      type="submit"
                      className={cn(ACTION, "hover:border-amber-500 hover:text-amber-400")}
                      aria-label={
                        reward.active
                          ? `Retirer ${reward.name} de la boutique`
                          : `Remettre ${reward.name} en boutique`
                      }
                    >
                      {reward.active ? (
                        <Eye className="size-4" aria-hidden />
                      ) : (
                        <EyeOff className="size-4" aria-hidden />
                      )}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0 space-y-3">
        <h2 className="font-hud text-base text-white">Nouvelle récompense</h2>
        <RewardForm />
      </section>
    </main>
  );
}
