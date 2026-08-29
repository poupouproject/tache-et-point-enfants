import { ArrowLeft, Flame } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoinCount } from "@/components/coin-count";
import { MoneyConverter, RewardShop } from "@/components/shop";
import { requireUnlocked } from "@/lib/auth/session";
import { childColor } from "@/lib/constants";
import { balanceOf, formatMoney } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { buildBoard } from "@/lib/tasks/service";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChildPage({ params }: PageProps<"/enfant/[id]">) {
  await requireUnlocked();

  // Next 16: les params de route sont asynchrones.
  const { id } = await params;

  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) notFound();

  const [balance, settings, rewards, transactions, board] = await Promise.all([
    balanceOf(prisma, child.id),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
    prisma.reward.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { costPoints: "asc" }],
    }),
    prisma.transaction.findMany({
      where: { childId: child.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    buildBoard(),
  ]);

  const colors = childColor(child.color);
  const streak = board.find((entry) => entry.id === child.id)?.streak ?? 0;
  const pointsPerDollar = settings?.pointsPerDollar ?? 100;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour au tableau
      </Link>

      <header
        className={cn("panel mb-5 flex items-center gap-4 border-t-8 p-5", colors.border)}
      >
        <span
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg",
            colors.gradient,
            colors.glow,
          )}
          aria-hidden
        >
          {child.avatar}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-hud text-lg text-white">{child.name}</h1>
          {streak > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange-300">
              <Flame className="size-4" aria-hidden />
              {streak} jour{streak > 1 ? "s" : ""} d&apos;affilée
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <CoinCount value={balance} size="lg" />
          <p className="mt-1 text-xs font-bold text-hud-400">
            vaut {formatMoney(Math.floor(balance / pointsPerDollar) * 100)}
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <RewardShop childId={child.id} balance={balance} rewards={rewards} />

        <MoneyConverter
          childId={child.id}
          balance={balance}
          pointsPerDollar={pointsPerDollar}
        />
      </div>

      <section className="panel mt-5 p-5">
        <h2 className="font-hud text-base text-white">Historique</h2>

        {transactions.length === 0 ? (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-8 text-center text-sm font-bold text-hud-400">
            Rien encore
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hud-800">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-hud-400">
                    {formatDateTime(transaction.createdAt)}
                    {transaction.createdBy === "PARENT" && " · par un parent"}
                  </p>
                </div>

                <span
                  className={cn(
                    "shrink-0 font-hud text-sm tabular-nums",
                    transaction.points >= 0
                      ? "text-emerald-400"
                      : "text-rose-400",
                  )}
                >
                  {transaction.points >= 0 ? "+" : ""}
                  {transaction.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
