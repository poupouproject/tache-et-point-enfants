"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { undoCompletion } from "@/app/parent/actions";

/**
 * Annulation d'une tâche confirmée, en deux temps: un premier tap demande
 * confirmation, en disant ce qui va se passer. Un doigt qui accroche le bouton
 * en faisant défiler la liste ne retire plus de pièces à un enfant.
 */
export function UndoButton({
  completionId,
  title,
  childName,
  points,
}: {
  completionId: string;
  title: string;
  childName: string;
  points: number;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-rose-500 hover:text-rose-400"
        aria-label={`Annuler ${title} pour ${childName}`}
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <form
      action={undoCompletion}
      className="flex w-full animate-pop-in flex-wrap items-center justify-end gap-2 rounded-2xl bg-rose-500/10 p-2"
    >
      <input type="hidden" name="id" value={completionId} />
      <p className="min-w-0 flex-1 px-2 text-sm font-bold text-rose-200">
        Retirer {points} pièce{points > 1 ? "s" : ""} à {childName} ?
      </p>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-xl bg-hud-700 px-4 py-2 text-sm font-bold text-hud-200 hover:bg-hud-600"
      >
        Non
      </button>
      <button
        type="submit"
        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
      >
        Oui, annuler
      </button>
    </form>
  );
}
