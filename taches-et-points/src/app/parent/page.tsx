import { Banknote, Gift } from "lucide-react";

import { CoinCount } from "@/components/coin-count";
import { AdjustPointsForm } from "@/components/parent/adjust-points-form";
import { requireParent } from "@/lib/auth/session";
import { childColor } from "@/lib/constants";
import { balancesByChild, formatMoney } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { pendingRequests } from "@/lib/rewards/service";
import { formatDateTime } from "@/lib/time";
import { spendingActivity, taskActivity } from "@/lib/activity";
import { ActivitySection, type ActivityView } from "@/components/parent/activity-section";
import { cn } from "@/lib/utils";

import { decideConversion, decideRedemption } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParentHomePage({ searchParams }: PageProps<"/parent">) {
  await requireParent();

  // Section Activité: onglet et enfant choisis par ses liens.
  const params = await searchParams;
  const view: ActivityView = params.activite === "recompenses" ? "recompenses" : "taches";
  const childId = typeof params.enfant === "string" ? params.enfant : null;

  const [children, balances, { redemptions, conversions }, days] =
    await Promise.all([
      prisma.child.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
      balancesByChild(),
      pendingRequests(),
      view === "taches" ? taskActivity(childId) : spendingActivity(childId),
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
      <ActivitySection
        view={view}
        childId={childId}
        kids={children.map(({ id, name, avatar }) => ({ id, name, avatar }))}
        days={days}
      />
    </main>
  );
}
