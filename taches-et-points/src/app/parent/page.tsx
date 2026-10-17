import { Banknote, Gift, RotateCcw } from "lucide-react";

import { CoinCount } from "@/components/coin-count";
import { AdjustPointsForm } from "@/components/parent/adjust-points-form";
import { requireParent } from "@/lib/auth/session";
import { childColor } from "@/lib/constants";
import { balancesByChild, formatMoney } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { pendingRequests } from "@/lib/rewards/service";
import { recentCompletions } from "@/lib/tasks/service";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

import { decideConversion, decideRedemption, undoCompletion } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParentHomePage() {
  await requireParent();

  const [children, balances, { redemptions, conversions }, completions] =
    await Promise.all([
      prisma.child.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
      balancesByChild(),
      pendingRequests(),
      recentCompletions(15),
    ]);

  const pendingCount = redemptions.length + conversions.length;

  return (
    <main className="space-y-5">
      {/* Soldes */}
      <section className="panel p-5">
        <h2 className="font-hud text-base text-white">Soldes</h2>

        {children.length === 0 ? (
          <p className="mt-4 text-sm text-hud-400">
            Aucun enfant. Ajoutez-en depuis l&apos;onglet Enfants.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const colors = childColor(child.color);

              return (
                <li
                  key={child.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 border-l-8 border-hud-700 bg-hud-800 p-3",
                    colors.border,
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    {child.avatar}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold text-white">
                    {child.name}
                  </span>
                  <CoinCount value={balances.get(child.id) ?? 0} size="sm" />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Demandes en attente */}
      <section className="panel p-5">
        <h2 className="font-hud text-base text-white">
          À approuver{" "}
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-rose-500 px-2.5 py-1 text-xs text-white">
              {pendingCount}
            </span>
          )}
        </h2>

        {pendingCount === 0 ? (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-6 text-center text-sm font-bold text-hud-400">
            Rien en attente
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {redemptions.map((redemption) => (
              <li
                key={redemption.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-hud-700 bg-hud-800 p-3"
              >
                <Gift className="size-5 shrink-0 text-violet-400" aria-hidden />

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">
                    {redemption.child.avatar} {redemption.child.name} veut{" "}
                    <span className="text-violet-300">
                      {redemption.rewardName}
                    </span>
                  </p>
                  <p className="text-xs text-hud-400">
                    {redemption.pointsSpent} pièces ·{" "}
                    {formatDateTime(redemption.createdAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <form action={decideRedemption}>
                    <input type="hidden" name="id" value={redemption.id} />
                    <input type="hidden" name="decision" value="FULFILLED" />
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2.5 text-sm"
                    >
                      Donné
                    </button>
                  </form>

                  <form action={decideRedemption}>
                    <input type="hidden" name="id" value={redemption.id} />
                    <input type="hidden" name="decision" value="REJECTED" />
                    <button
                      type="submit"
                      className="btn-secondary px-4 py-2.5 text-sm"
                    >
                      Refuser
                    </button>
                  </form>
                </div>
              </li>
            ))}

            {conversions.map((conversion) => (
              <li
                key={conversion.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-hud-700 bg-hud-800 p-3"
              >
                <Banknote
                  className="size-5 shrink-0 text-emerald-400"
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">
                    {conversion.child.avatar} {conversion.child.name} veut{" "}
                    <span className="text-emerald-300">
                      {formatMoney(conversion.amountCents)}
                    </span>
                  </p>
                  <p className="text-xs text-hud-400">
                    {conversion.points} pièces ·{" "}
                    {formatDateTime(conversion.createdAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <form action={decideConversion}>
                    <input type="hidden" name="id" value={conversion.id} />
                    <input type="hidden" name="decision" value="PAID" />
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2.5 text-sm"
                    >
                      Payé
                    </button>
                  </form>

                  <form action={decideConversion}>
                    <input type="hidden" name="id" value={conversion.id} />
                    <input type="hidden" name="decision" value="REJECTED" />
                    <button
                      type="submit"
                      className="btn-secondary px-4 py-2.5 text-sm"
                    >
                      Refuser
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ajustement manuel */}
      <AdjustPointsForm kids={children} />

      {/* Confirmations récentes, avec annulation */}
      <section className="panel p-5">
        <h2 className="font-hud text-base text-white">Tâches confirmées</h2>
        <p className="mt-2 text-sm text-hud-400">
          Annuler retire les points et remet la tâche à faire.
        </p>

        {completions.length === 0 ? (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-6 text-center text-sm font-bold text-hud-400">
            Aucune tâche confirmée
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hud-800">
            {completions.map((completion) => (
              <li key={completion.id} className="flex items-center gap-3 py-3">
                <span className="text-xl" aria-hidden>
                  {completion.child.avatar}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {completion.task?.title ?? "Tâche supprimée"}
                  </p>
                  <p className="text-xs text-hud-400">
                    {completion.child.name} ·{" "}
                    {formatDateTime(completion.completedAt)}
                  </p>
                </div>

                <CoinCount value={completion.pointsAwarded} size="sm" />

                <form action={undoCompletion}>
                  <input type="hidden" name="id" value={completion.id} />
                  <button
                    type="submit"
                    className="inline-flex size-9 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-rose-500 hover:text-rose-400"
                    aria-label={`Annuler ${completion.task?.title ?? "cette tâche"} pour ${completion.child.name}`}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
