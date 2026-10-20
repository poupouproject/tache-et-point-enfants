"use client";

import { Lock, LockOpen } from "lucide-react";
import { useActionState, useState } from "react";

import { lockChildSpending, unlockChildSpending, type FormState } from "@/app/parent/actions";

type Duration = { key: string; label: string };

/**
 * Fermer la boutique d'un enfant pour un temps: récompenses et argent. Il
 * peut toujours gagner des pièces. La raison s'affiche sur sa carte.
 */
export function SpendLockForm({
  childId,
  childName,
  lock,
  durations,
  reasonMax,
}: {
  childId: string;
  childName: string;
  lock: { until: string; reason: string | null } | null;
  durations: readonly Duration[];
  reasonMax: number;
}) {
  const [state, lockAction, locking] = useActionState<FormState, FormData>(lockChildSpending, {});
  const [open, setOpen] = useState(false);

  if (lock) {
    return (
      <form action={unlockChildSpending} className="flex flex-wrap items-center gap-3 rounded-2xl bg-rose-500/10 p-3">
        <input type="hidden" name="childId" value={childId} />
        <Lock className="size-5 shrink-0 text-rose-300" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-rose-100">
          <span className="font-bold">Boutique fermée jusqu&apos;à {lock.until}</span>
          {lock.reason && <span className="block text-rose-200/80">{lock.reason}</span>}
        </p>
        <button type="submit" className="btn-secondary px-4 py-2 text-sm">
          <LockOpen className="size-4" aria-hidden />
          Rouvrir
        </button>
      </form>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-rose-300"
      >
        <Lock className="size-4" aria-hidden />
        Fermer la boutique de {childName}
      </button>
    );
  }

  return (
    <form action={lockAction} className="space-y-3 rounded-2xl border-2 border-hud-700 p-3">
      <input type="hidden" name="childId" value={childId} />
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div>
          <label htmlFor={`duree-${childId}`} className="label">
            Pendant
          </label>
          <select id={`duree-${childId}`} name="duree" defaultValue="fin-journee" className="field">
            {durations.map((duration) => (
              <option key={duration.key} value={duration.key}>
                {duration.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`raison-${childId}`} className="label">
            Pourquoi (montré à {childName})
          </label>
          <input
            id={`raison-${childId}`}
            name="reason"
            maxLength={reasonMax}
            placeholder="Ex. chambre pas rangée"
            className="field"
          />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-bold text-rose-300">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 py-2 text-sm">
          Annuler
        </button>
        <button type="submit" disabled={locking} className="btn-danger px-4 py-2 text-sm">
          <Lock className="size-4" aria-hidden />
          Fermer la boutique
        </button>
      </div>
    </form>
  );
}
