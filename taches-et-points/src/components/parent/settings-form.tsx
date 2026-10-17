"use client";

import { useActionState } from "react";

import { saveSettings, type FormState } from "@/app/parent/actions";

export function SettingsForm({
  pointsPerDollar,
}: {
  pointsPerDollar: number;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveSettings,
    {},
  );

  return (
    <form action={formAction} className="panel space-y-5 p-5">
      <div>
        <label htmlFor="pointsPerDollar" className="label">
          Pièces pour 1 dollar
        </label>
        <input
          id="pointsPerDollar"
          name="pointsPerDollar"
          type="number"
          min={1}
          required
          defaultValue={pointsPerDollar}
          className="field"
        />
        <p className="mt-2 text-xs text-hud-400">
          Sert au calcul quand un enfant convertit ses pièces en argent.
        </p>
      </div>

      <hr className="border-hud-800" />

      <div>
        <label htmlFor="accessPin" className="label">
          Nouveau NIP d&apos;entrée
        </label>
        <input
          id="accessPin"
          name="accessPin"
          inputMode="numeric"
          pattern="\d{4,8}"
          autoComplete="new-password"
          placeholder="Laisser vide pour ne pas changer"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="parentPin" className="label">
          Nouveau NIP parent
        </label>
        <input
          id="parentPin"
          name="parentPin"
          inputMode="numeric"
          pattern="\d{4,8}"
          autoComplete="new-password"
          placeholder="Laisser vide pour ne pas changer"
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
        Enregistrer les réglages
      </button>
    </form>
  );
}
