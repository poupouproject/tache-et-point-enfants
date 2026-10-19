"use client";

import { useActionState, useState } from "react";

import { saveReward, type FormState } from "@/app/parent/actions";
import { REWARD_ICON_KEYS, TaskIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type RewardDefaults = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  costPoints: number;
};

/** Ajout d'une récompense, ou modification quand `reward` est fourni. */
export function RewardForm({ reward }: { reward?: RewardDefaults }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveReward,
    {},
  );
  const [icon, setIcon] = useState(reward?.icon ?? "gift");

  return (
    <form action={formAction} className="panel space-y-5 p-5">
      {reward && <input type="hidden" name="id" value={reward.id} />}
      <input type="hidden" name="icon" value={icon} />

      <div>
        <label htmlFor="reward-name" className="label">
          Nom
        </label>
        <input
          id="reward-name"
          name="name"
          required
          maxLength={80}
          defaultValue={reward?.name}
          placeholder="Ex. 30 min de jeu vidéo"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="reward-description" className="label">
          Détails (facultatif)
        </label>
        <input
          id="reward-description"
          name="description"
          maxLength={200}
          defaultValue={reward?.description ?? undefined}
          className="field"
        />
      </div>

      <div>
        <span className="label">Icône</span>
        <div className="flex flex-wrap gap-2">
          {REWARD_ICON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={`Icône ${key}`}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border-2 transition-colors",
                icon === key
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-hud-700 bg-hud-800 text-hud-400 hover:text-white",
              )}
            >
              <TaskIcon name={key} className="size-5" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="costPoints" className="label">
          Coût en pièces
        </label>
        <input
          id="costPoints"
          name="costPoints"
          type="number"
          min={1}
          required
          defaultValue={reward?.costPoints ?? 50}
          className="field"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-bold text-rose-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm font-bold text-emerald-300">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {reward ? "Enregistrer" : "Ajouter la récompense"}
      </button>
    </form>
  );
}
