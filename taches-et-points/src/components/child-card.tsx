"use client";

import { Flame, History, Pencil, Plus, ShoppingBag, Users } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { confirmTask } from "@/app/actions";
import { AnimatedBalance, flyCoins } from "@/components/coin-flight";
import { CoinCount } from "@/components/coin-count";
import { TaskIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { MoneyConverter, RewardShop } from "@/components/shop";
import { childColor } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { ChildBoard, DueTask } from "@/lib/tasks/service";
import { cn } from "@/lib/utils";
import { reloadOnce } from "@/lib/reload";

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  costPoints: number;
};

export type HistoryEntry = {
  id: string;
  description: string;
  points: number;
  /** Déjà formaté côté serveur, dans le fuseau de la famille. */
  when: string;
  byParent: boolean;
};

type Panel = "tasks" | "shop" | "history" | null;

const CHEERS = ["Bravo !", "Super !", "Génial !", "Wow !", "Champion !"];

/**
 * Carte d'un enfant au tableau de bord: son solde, ce qui lui reste à faire,
 * et trois boutons. Les tâches, la boutique et l'historique s'ouvrent dans une
 * fenêtre: la carte reste courte, et toutes tiennent à l'écran d'une tablette
 * sans défiler.
 */
export function ChildCard({
  child,
  rewards,
  pointsPerDollar,
  history,
}: {
  child: ChildBoard;
  rewards: Reward[];
  pointsPerDollar: number;
  history: HistoryEntry[];
}) {
  const colors = childColor(child.color);
  const [panel, setPanel] = useState<Panel>(null);
  const [holdBalance, setHoldBalance] = useState(false);
  const balanceRef = useRef<HTMLDivElement>(null);

  // Sortie de la fenêtre des tâches après un « Bravo »: la fenêtre se ferme,
  // puis les pièces volent de la tâche touchée jusqu'au solde, qui monte
  // seulement quand elles arrivent.
  async function celebrate(from: DOMRect, points: number) {
    setPanel(null);
    const target = balanceRef.current?.getBoundingClientRect();
    if (target) await flyCoins(from, target, points);
    setHoldBalance(false);
  }

  return (
    <section
      className={cn("panel flex flex-col gap-4 border-t-8 p-5", colors.border)}
      aria-label={`Carte de ${child.name}`}
    >
      <header className="flex items-center gap-4">
        <Link
          href={`/enfant/${child.id}`}
          className={cn(
            "relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg",
            colors.gradient,
            colors.glow,
          )}
          aria-label={`Changer l'avatar de ${child.name}`}
        >
          <span aria-hidden>{child.avatar}</span>
          <span className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full border-2 border-hud-900 bg-hud-700 text-hud-200">
            <Pencil className="size-3.5" aria-hidden />
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-hud text-base text-white">{child.name}</h2>
          {child.streak > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange-300">
              <Flame className="size-4" aria-hidden />
              {child.streak} jour{child.streak > 1 ? "s" : ""} d&apos;affilée
            </p>
          )}
        </div>
      </header>

      <div ref={balanceRef} className="text-center">
        <AnimatedBalance value={child.balance} hold={holdBalance} className="text-4xl sm:text-5xl" />
        <p className="mt-2 text-xs font-bold text-hud-400">
          vaut {formatMoney(Math.floor(child.balance / pointsPerDollar) * 100)}
        </p>
      </div>

      <p
        className={cn(
          "rounded-2xl px-4 py-2.5 text-center text-sm font-bold",
          child.remaining > 0
            ? "bg-amber-500/15 text-amber-300"
            : "bg-emerald-500/15 text-emerald-300",
        )}
      >
        {child.remaining > 0
          ? `${child.remaining} tâche${child.remaining > 1 ? "s" : ""} à faire aujourd'hui`
          : "Tout est fait ! 🎉"}
      </p>

      <div className="mt-auto grid gap-3">
        <button
          type="button"
          onClick={() => setPanel("tasks")}
          disabled={child.tasks.length === 0}
          className="btn-primary w-full"
        >
          <Plus className="size-6" aria-hidden />
          J&apos;ai fait une tâche
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setPanel("shop")} className="btn-coin px-3 text-base">
            <ShoppingBag className="size-5" aria-hidden />
            Dépenser
          </button>
          <button type="button" onClick={() => setPanel("history")} className="btn-secondary px-3 text-base">
            <History className="size-5" aria-hidden />
            Historique
          </button>
        </div>
      </div>

      <Modal
        open={panel === "tasks"}
        onClose={() => setPanel(null)}
        title={`Qu'est-ce que tu as fait, ${child.name} ?`}
      >
        <TaskPicker
          child={child}
          // Le solde est figé dès le tap: le serveur renvoie le nouveau solde
          // avec la confirmation, avant que les pièces aient volé.
          onStart={() => setHoldBalance(true)}
          onFail={() => setHoldBalance(false)}
          onDone={celebrate}
        />
      </Modal>

      <Modal open={panel === "shop"} onClose={() => setPanel(null)} title={`La boutique de ${child.name}`}>
        <div className="grid gap-5 lg:grid-cols-2">
          <RewardShop childId={child.id} balance={child.balance} rewards={rewards} />
          <MoneyConverter childId={child.id} balance={child.balance} pointsPerDollar={pointsPerDollar} />
        </div>
      </Modal>

      <Modal open={panel === "history"} onClose={() => setPanel(null)} title={`L'historique de ${child.name}`}>
        <HistoryList entries={history} />
      </Modal>
    </section>
  );
}

/**
 * Les tâches que l'enfant peut confirmer: les siennes d'abord, puis celles
 * au choix pour toute la famille. Un tap confirme, affiche un « Bravo » et
 * referme la fenêtre en envoyant les pièces vers le solde.
 */
function TaskPicker({
  child,
  onStart,
  onFail,
  onDone,
}: {
  child: ChildBoard;
  onStart: () => void;
  onFail: () => void;
  onDone: (from: DOMRect, points: number) => Promise<void>;
}) {
  const colors = childColor(child.color);
  const [pending, startTransition] = useTransition();
  const [cheer, setCheer] = useState<{ text: string; points: number; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const own = child.tasks.filter((task) => task.type !== "FAMILY");
  const shared = child.tasks.filter((task) => task.type === "FAMILY");

  function confirm(task: DueTask, button: HTMLButtonElement) {
    const from = button.getBoundingClientRect();
    setError(null);
    onStart();

    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("childId", child.id);

      let result: Awaited<ReturnType<typeof confirmTask>>;
      try {
        result = await confirmTask({ status: "idle" }, formData);
      } catch {
        // Presque toujours une page chargée avant une mise à jour de l'app:
        // le serveur ne reconnaît plus l'action. Rien n'a été enregistré,
        // la page se recharge avec la nouvelle version.
        onFail();
        setError("L'application vient d'être mise à jour, un instant…");
        reloadOnce();
        return;
      }

      if (result.status !== "done") {
        onFail();
        setError(result.status === "error" ? result.message : "Oups, réessaie.");
        return;
      }

      setCheer({
        text: CHEERS[Math.floor(Math.random() * CHEERS.length)],
        points: result.points,
        title: result.title,
      });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await onDone(from, result.points);
      setCheer(null);
    });
  }

  if (cheer) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 py-8 text-center" role="status">
        <p className="animate-bravo text-6xl" aria-hidden>
          🎉
        </p>
        <p className="animate-bravo font-hud text-3xl text-white sm:text-4xl">{cheer.text}</p>
        <p className="text-lg font-bold text-hud-200">{cheer.title}</p>
        <CoinCount value={cheer.points} size="lg" className="animate-bravo" />
      </div>
    );
  }

  const renderTask = (task: DueTask) => (
    <li key={task.id}>
      <button
        type="button"
        disabled={pending}
        onClick={(event) => confirm(task, event.currentTarget)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border-2 border-b-[5px] border-hud-700 bg-hud-800 p-3 text-left",
          "transition-all duration-75 hover:border-hud-600 hover:bg-hud-700 active:translate-y-[4px] active:border-b-2",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white",
          "disabled:opacity-50 disabled:active:translate-y-0",
        )}
      >
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
          <TaskIcon name={task.icon} className="size-6 text-white" />
        </span>
        <span className="line-clamp-2 min-w-0 flex-1 font-bold break-words text-white">{task.title}</span>
        <CoinCount value={task.pointsValue} size="sm" className="shrink-0" />
      </button>
    </li>
  );

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="animate-pop-in rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300">
          {error}
        </p>
      )}

      {own.length > 0 && (
        <section>
          <h3 className="label">Mes tâches</h3>
          <ul className="grid gap-3 md:grid-cols-2">{own.map(renderTask)}</ul>
        </section>
      )}

      {shared.length > 0 && (
        <section>
          <h3 className="label inline-flex items-center gap-2">
            <Users className="size-4" aria-hidden />
            Au choix — le premier qui la fait gagne
          </h3>
          <ul className="grid gap-3 md:grid-cols-2">{shared.map(renderTask)}</ul>
        </section>
      )}
    </div>
  );
}

function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-hud-700 px-4 py-8 text-center text-sm font-bold text-hud-400">
        Rien encore
      </p>
    );
  }

  return (
    <ul className="divide-y divide-hud-800">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white">{entry.description}</p>
            <p className="text-xs text-hud-400">
              {entry.when}
              {entry.byParent && " · par un parent"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 font-hud text-sm tabular-nums",
              entry.points >= 0 ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {entry.points >= 0 ? "+" : ""}
            {entry.points}
          </span>
        </li>
      ))}
    </ul>
  );
}
