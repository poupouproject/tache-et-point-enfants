"use client";

import { Banknote, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { buyReward, convertToMoney, type ShopState } from "@/app/enfant/[id]/actions";
import { CoinCount } from "@/components/coin-count";
import { TaskIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  costPoints: number;
};

function Feedback({ state }: { state: ShopState }) {
  if (state.status === "idle") return null;

  return (
    <p
      role="status"
      className={cn(
        "animate-pop-in rounded-2xl px-4 py-3 text-sm font-bold",
        state.status === "done"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-rose-500/15 text-rose-300",
      )}
    >
      {state.message}
    </p>
  );
}

/** Boutique de récompenses: une grille de cartes achetables en pièces. */
export function RewardShop({
  childId,
  balance,
  rewards,
}: {
  childId: string;
  balance: number;
  rewards: Reward[];
}) {
  const [state, formAction, pending] = useActionState<ShopState, FormData>(
    buyReward,
    { status: "idle" },
  );

  return (
    <section className="panel p-5">
      <h2 className="font-hud text-base text-white">Boutique</h2>

      <div className="mt-4 space-y-3">
        <Feedback state={state} />

        {rewards.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-hud-700 px-4 py-8 text-center text-sm font-bold text-hud-400">
            Aucune récompense pour l&apos;instant
          </p>
        ) : (
          <ul className="grid gap-3">
            {rewards.map((reward) => {
              const affordable = balance >= reward.costPoints;

              return (
                <li key={reward.id}>
                  <form action={formAction}>
                    <input type="hidden" name="childId" value={childId} />
                    <input type="hidden" name="rewardId" value={reward.id} />

                    <button
                      type="submit"
                      disabled={!affordable || pending}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border-2 border-b-[5px] p-3 text-left transition-all duration-75",
                        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white",
                        affordable
                          ? "border-hud-700 bg-hud-800 hover:bg-hud-700 active:translate-y-[4px] active:border-b-2"
                          : "cursor-not-allowed border-hud-800 bg-hud-900 opacity-50",
                      )}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500">
                        <TaskIcon
                          name={reward.icon}
                          className="size-6 text-white"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 font-bold break-words text-white">
                          {reward.name}
                        </span>
                        {reward.description && (
                          <span className="block truncate text-xs text-hud-400">
                            {reward.description}
                          </span>
                        )}
                      </span>

                      <CoinCount value={reward.costPoints} size="sm" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Conversion de pièces en argent réel, au taux configuré par les parents. */
export function MoneyConverter({
  childId,
  balance,
  pointsPerDollar,
}: {
  childId: string;
  balance: number;
  pointsPerDollar: number;
}) {
  const [state, formAction, pending] = useActionState<ShopState, FormData>(
    convertToMoney,
    { status: "idle" },
  );

  // On ne propose que des multiples entiers du taux: convertir 37 pièces pour
  // 0,37 $ n'a pas de sens quand un parent doit sortir de la monnaie.
  const maxDollars = Math.floor(balance / pointsPerDollar);
  const [dollars, setDollars] = useState(1);

  // Le solde peut avoir baissé depuis le premier rendu (un achat fait ailleurs,
  // un ajustement d'un parent). Sans ce plafond, le champ caché enverrait un
  // montant que l'enfant ne peut plus payer, alors que l'écran vient de le lui
  // proposer.
  const requested = Math.min(dollars, maxDollars);

  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-hud text-base text-white">
        <Banknote className="size-5 text-emerald-400" aria-hidden />
        Argent
      </h2>

      <p className="mt-3 text-sm text-hud-400">
        {pointsPerDollar} pièces = 1 $
      </p>

      <div className="mt-4 space-y-3">
        <Feedback state={state} />

        {maxDollars < 1 ? (
          <p className="rounded-2xl border-2 border-dashed border-hud-700 px-4 py-6 text-center text-sm font-bold text-hud-400">
            Il faut au moins {pointsPerDollar} pièces pour convertir
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="childId" value={childId} />
            <input
              type="hidden"
              name="points"
              value={requested * pointsPerDollar}
            />

            <div>
              <label htmlFor="dollars" className="label">
                Montant : {requested} $
              </label>
              <input
                id="dollars"
                type="range"
                min={1}
                max={maxDollars}
                value={requested}
                onChange={(event) => setDollars(Number(event.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="mt-2 text-sm text-hud-400">
                Coûte{" "}
                <span className="font-bold text-coin">
                  {requested * pointsPerDollar} pièces
                </span>
              </p>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full"
            >
              {pending ? (
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
              ) : (
                `Demander ${requested} $`
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
