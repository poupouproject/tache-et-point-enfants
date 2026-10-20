"use client";

import { useActionState } from "react";

import { ManagedPin } from "@/components/managed-pin";

import { completeSetup, type SetupState } from "./actions";

export function SetupForm({
  managed,
}: {
  managed: { access: boolean; parent: boolean };
}) {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(
    completeSetup,
    {},
  );

  return (
    <form action={formAction} className="panel w-full max-w-md space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="font-hud text-lg leading-relaxed text-white">
          Quêtes &amp; Pièces
        </h1>
        <p className="mt-3 text-sm text-hud-400">
          Première visite ! Choisissez deux NIP pour protéger l&apos;application.
        </p>
      </div>

      {managed.access ? (
        <ManagedPin label="NIP d'entrée" />
      ) : (
        <div>
          <label htmlFor="accessPin" className="label">
            NIP d&apos;entrée
          </label>
          <input
            id="accessPin"
            name="accessPin"
            inputMode="numeric"
            pattern="\d{4,8}"
            required
            autoComplete="new-password"
            placeholder="4 à 8 chiffres"
            className="field"
          />
          <p className="mt-2 text-xs text-hud-400">
            Toute la famille l&apos;utilise pour ouvrir l&apos;application.
          </p>
        </div>
      )}

      {managed.parent ? (
        <ManagedPin label="NIP parent" />
      ) : (
        <div>
          <label htmlFor="parentPin" className="label">
            NIP parent
          </label>
          <input
            id="parentPin"
            name="parentPin"
            inputMode="numeric"
            pattern="\d{4,8}"
            required
            autoComplete="new-password"
            placeholder="4 à 8 chiffres"
            className="field"
          />
          <p className="mt-2 text-xs text-hud-400">
            Gardez-le pour vous: il donne accès aux tâches, aux pièces et aux
            réglages.
          </p>
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="animate-pop-in rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        Commencer
      </button>
    </form>
  );
}
