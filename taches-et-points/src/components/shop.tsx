"use client";

import { Banknote, Gift, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

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

/** Ce que l'enfant s'apprête à demander. */
type Choice =
  | { kind: "reward"; id: string; title: string; icon: string; points: number }
  | { kind: "money"; title: string; points: number };

/**
 * La boutique, en trois temps: choisir, confirmer, « Demandé ! ». Sans la
 * confirmation, un tap de travers dépensait des pièces; sans l'écran final,
 * rien ne disait à l'enfant que sa demande était partie.
 *
 * Le solde de la carte est figé dès la confirmation (onStart): le serveur
 * renvoie le nouveau solde avec la réponse, avant que les pièces aient quitté
 * la carte sous les yeux de l'enfant (onDone).
 */
export function Shop({
  childId,
  balance,
  rewards,
  pointsPerDollar,
  onStart,
  onFail,
  onDone,
}: {
  childId: string;
  balance: number;
  rewards: Reward[];
  pointsPerDollar: number;
  onStart: () => void;
  onFail: () => void;
  onDone: (points: number) => Promise<void>;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [requested, setRequested] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm(chosen: Choice) {
    setError(null);
    onStart();

    startTransition(async () => {
      const formData = new FormData();
      formData.set("childId", childId);
      let result: ShopState;
      try {
        if (chosen.kind === "reward") {
          formData.set("rewardId", chosen.id);
          result = await buyReward({ status: "idle" }, formData);
        } else {
          formData.set("points", String(chosen.points));
          result = await convertToMoney({ status: "idle" }, formData);
        }
      } catch {
        result = { status: "error", message: "Oups, réessaie dans un instant." };
      }

      if (result.status !== "done") {
        onFail();
        setError(result.status === "error" ? result.message : "Oups, réessaie.");
        return;
      }

      setRequested(chosen);
      await new Promise((resolve) => setTimeout(resolve, 1600));
      await onDone(chosen.points);
      setRequested(null);
      setChoice(null);
    });
  }

  if (requested) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 py-8 text-center" role="status">
        <p className="animate-bravo text-6xl" aria-hidden>
          {requested.kind === "reward" ? "🎁" : "💵"}
        </p>
        <p className="animate-bravo font-hud text-3xl text-white sm:text-4xl">Demandé !</p>
        <p className="text-lg font-bold text-hud-200">{requested.title}</p>
        <CoinCount value={-requested.points} size="lg" className="animate-bravo text-rose-300" />
        <p className="text-sm text-hud-400">Papa ou maman doit maintenant confirmer.</p>
      </div>
    );
  }

  if (choice) {
    const left = balance - choice.points;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center">
        <span
          className={cn(
            "flex size-20 items-center justify-center rounded-3xl",
            choice.kind === "reward" ? "bg-violet-500" : "bg-emerald-500",
          )}
        >
          {choice.kind === "reward" ? (
            <TaskIcon name={choice.icon} className="size-10 text-white" />
          ) : (
            <Banknote className="size-10 text-white" aria-hidden />
          )}
        </span>
        <p className="font-hud text-base leading-relaxed text-white">Tu veux « {choice.title} » ?</p>
        <p className="text-hud-200">
          Ça coûte <span className="font-bold text-coin">{choice.points} pièces</span>. Il t&apos;en
          restera <span className="font-bold text-coin">{left}</span>.
        </p>
        <p className="text-sm text-hud-400">Un parent devra confirmer.</p>

        {error && (
          <p role="alert" className="w-full animate-pop-in rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300">
            {error}
          </p>
        )}

        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setChoice(null);
              setError(null);
            }}
            className="btn-secondary px-3 text-base"
          >
            Non
          </button>
          <button type="button" disabled={pending} onClick={() => confirm(choice)} className="btn-primary px-3 text-base">
            {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : "Oui, je confirme"}
          </button>
        </div>
      </div>
    );
  }

  return (
    // Côte à côte, la liste des récompenses défile seule: le panneau Argent
    // reste en place au lieu de remonter avec elle.
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <RewardList
        balance={balance}
        rewards={rewards}
        onChoose={(reward) =>
          setChoice({ kind: "reward", id: reward.id, title: reward.name, icon: reward.icon, points: reward.costPoints })
        }
      />
      <div className="lg:sticky lg:top-0">
        <MoneyConverter
          balance={balance}
          pointsPerDollar={pointsPerDollar}
          onChoose={(dollars) =>
            setChoice({ kind: "money", title: `${dollars} $ en argent`, points: dollars * pointsPerDollar })
          }
        />
      </div>
    </div>
  );
}

function RewardList({
  balance,
  rewards,
  onChoose,
}: {
  balance: number;
  rewards: Reward[];
  onChoose: (reward: Reward) => void;
}) {
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-hud text-base text-white">
        <Gift className="size-5 text-violet-400" aria-hidden />
        Boutique
      </h2>

      {rewards.length === 0 ? (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-8 text-center text-sm font-bold text-hud-400">
          Aucune récompense pour l&apos;instant
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {rewards.map((reward) => {
            const affordable = balance >= reward.costPoints;
            return (
              <li key={reward.id}>
                <button
                  type="button"
                  onClick={() => onChoose(reward)}
                  disabled={!affordable}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 border-b-[5px] p-3 text-left transition-all duration-75",
                    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white",
                    affordable
                      ? "border-hud-700 bg-hud-800 hover:bg-hud-700 active:translate-y-[4px] active:border-b-2"
                      : "cursor-not-allowed border-hud-800 bg-hud-900 opacity-50",
                  )}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500">
                    <TaskIcon name={reward.icon} className="size-6 text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-bold break-words text-white">{reward.name}</span>
                    {reward.description && (
                      <span className="block truncate text-xs text-hud-400">{reward.description}</span>
                    )}
                  </span>
                  <CoinCount value={reward.costPoints} size="sm" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Conversion de pièces en argent réel, au taux configuré par les parents. */
function MoneyConverter({
  balance,
  pointsPerDollar,
  onChoose,
}: {
  balance: number;
  pointsPerDollar: number;
  onChoose: (dollars: number) => void;
}) {
  // On ne propose que des multiples entiers du taux: convertir 37 pièces pour
  // 0,37 $ n'a pas de sens quand un parent doit sortir de la monnaie.
  const maxDollars = Math.floor(balance / pointsPerDollar);
  const [dollars, setDollars] = useState(1);
  // Le solde peut avoir baissé depuis le premier rendu: on plafonne.
  const requested = Math.min(dollars, maxDollars);

  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-hud text-base text-white">
        <Banknote className="size-5 text-emerald-400" aria-hidden />
        Argent
      </h2>
      <p className="mt-3 text-sm text-hud-400">{pointsPerDollar} pièces = 1 $</p>

      {maxDollars < 1 ? (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-6 text-center text-sm font-bold text-hud-400">
          Il faut au moins {pointsPerDollar} pièces pour convertir
        </p>
      ) : (
        <div className="mt-4 space-y-4">
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
              Coûte <span className="font-bold text-coin">{requested * pointsPerDollar} pièces</span>
            </p>
          </div>
          <button type="button" onClick={() => onChoose(requested)} className="btn-primary w-full">
            Demander {requested} $
          </button>
        </div>
      )}
    </section>
  );
}
