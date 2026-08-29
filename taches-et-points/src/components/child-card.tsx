"use client";

import { Check, Flame, LoaderCircle, Users } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { CoinCount } from "@/components/coin-count";
import { TaskIcon } from "@/components/icons";
import { confirmTask, type CompleteState } from "@/app/actions";
import { childColor } from "@/lib/constants";
import type { ChildBoard } from "@/lib/tasks/service";
import { cn } from "@/lib/utils";

/**
 * Carte d'un enfant sur le kiosque: son solde, sa série, et ses quêtes du jour.
 * Toute la carte est en couleur d'accent de l'enfant pour qu'il repère la
 * sienne d'un coup d'œil, de loin.
 */
export function ChildCard({ child }: { child: ChildBoard }) {
  const colors = childColor(child.color);
  const [state, formAction, pending] = useActionState<CompleteState, FormData>(
    confirmTask,
    { status: "idle" },
  );

  return (
    <section
      className={cn(
        "panel relative flex flex-col overflow-hidden border-t-8",
        colors.border,
      )}
      aria-label={`Quêtes de ${child.name}`}
    >
      {/* En-tête: avatar, nom, série et compteur de pièces. */}
      <header className="flex items-center gap-4 p-5 pb-4">
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
          <h2 className="truncate font-hud text-base text-white">
            {child.name}
          </h2>

          {child.streak > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange-300">
              <Flame className="size-4" aria-hidden />
              {child.streak} jour{child.streak > 1 ? "s" : ""} d&apos;affilée
            </p>
          )}
        </div>

        <div className="relative shrink-0 text-right">
          <CoinCount value={child.balance} size="lg" />

          {/*
            L'animation se termine à opacité 0, donc la pastille disparaît
            d'elle-même; la `key` change à chaque confirmation pour la rejouer.
          */}
          {state.status === "done" && (
            <span
              key={state.at}
              className="pointer-events-none absolute inset-x-0 -top-2 animate-coin-pop font-hud text-lg text-emerald-300"
              aria-hidden
            >
              +{state.points}
            </span>
          )}
        </div>
      </header>

      {state.status === "error" && (
        <p
          role="alert"
          className="mx-5 mb-3 animate-pop-in rounded-2xl bg-rose-500/15 px-4 py-2.5 text-sm font-bold text-rose-300"
        >
          {state.message}
        </p>
      )}

      {/* Liste des quêtes disponibles. */}
      <div className="flex-1 space-y-3 px-5 pb-5">
        {child.tasks.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-hud-700 px-4 py-8 text-center text-sm font-bold text-hud-400">
            {child.doneToday.length > 0
              ? "Tout est fait ! Bravo 🎉"
              : "Aucune quête pour le moment"}
          </p>
        ) : (
          child.tasks.map((task) => (
            <form key={task.id} action={formAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="childId" value={child.id} />

              <button
                type="submit"
                disabled={pending}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl border-2 border-hud-700 border-b-[5px] bg-hud-800 p-3 text-left",
                  "transition-all duration-75 active:translate-y-[4px] active:border-b-2",
                  "hover:border-hud-600 hover:bg-hud-700",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white",
                  "disabled:opacity-50 disabled:active:translate-y-0",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    colors.bg,
                  )}
                >
                  <TaskIcon name={task.icon} className="size-6 text-white" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">
                    {task.title}
                  </span>

                  {task.type === "FAMILY" && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-hud-400">
                      <Users className="size-3.5" aria-hidden />
                      Premier arrivé
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <CoinCount value={task.pointsValue} size="sm" />
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 transition-colors group-hover:bg-emerald-500 group-hover:text-emerald-950">
                    {pending ? (
                      <LoaderCircle className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-5" aria-hidden />
                    )}
                  </span>
                </span>
              </button>
            </form>
          ))
        )}
      </div>

      {/* Ce qui a déjà été fait aujourd'hui, en pied de carte. */}
      {child.doneToday.length > 0 && (
        <footer className="border-t-2 border-hud-800 bg-hud-950/50 px-5 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-hud-400">
            Fait aujourd&apos;hui
          </p>
          <ul className="flex flex-wrap gap-2">
            {child.doneToday.map((done, index) => (
              <li
                key={index}
                className="chip bg-emerald-500/15 text-emerald-300"
              >
                <Check className="size-3.5" aria-hidden />
                {done.title}
              </li>
            ))}
          </ul>
        </footer>
      )}

      <Link
        href={`/enfant/${child.id}`}
        className="border-t-2 border-hud-800 px-5 py-3 text-center text-sm font-bold text-hud-400 transition-colors hover:bg-hud-800 hover:text-white"
      >
        Historique et boutique →
      </Link>
    </section>
  );
}
