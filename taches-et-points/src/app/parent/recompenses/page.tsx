import { Eye, EyeOff } from "lucide-react";

import { CoinCount } from "@/components/coin-count";
import { TaskIcon } from "@/components/icons";
import { RewardForm } from "@/components/parent/reward-form";
import { requireParent } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { toggleReward } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParentRewardsPage() {
  await requireParent();

  const rewards = await prisma.reward.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
  });

  return (
    <main className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3">
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
                  "panel flex items-center gap-3 p-4",
                  !reward.active && "opacity-50",
                )}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500">
                  <TaskIcon name={reward.icon} className="size-6 text-white" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{reward.name}</p>
                  {reward.description && (
                    <p className="truncate text-xs text-hud-400">
                      {reward.description}
                    </p>
                  )}
                </div>

                <CoinCount value={reward.costPoints} size="sm" />

                <form action={toggleReward}>
                  <input type="hidden" name="id" value={reward.id} />
                  <button
                    type="submit"
                    className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-amber-500 hover:text-amber-400"
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-hud text-base text-white">Nouvelle récompense</h2>
        <RewardForm />
      </section>
    </main>
  );
}
