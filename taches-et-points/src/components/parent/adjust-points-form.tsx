"use client";

import { Minus, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { adjustPoints, type FormState } from "@/app/parent/actions";
import { cn } from "@/lib/utils";

type Kid = { id: string; name: string; avatar: string };

/**
 * Crédit ou débit manuel. Le signe est choisi par deux boutons plutôt que par
 * un « - » à taper: c'est la source d'erreur la plus probable ici.
 */
export function AdjustPointsForm({ kids }: { kids: Kid[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    adjustPoints,
    {},
  );
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("");

  if (kids.length === 0) return null;

  const signedValue = amount ? String(sign * Math.abs(Number(amount))) : "";

  return (
    <section className="panel p-5">
      <h2 className="font-hud text-base text-white">Ajuster des pièces</h2>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="points" value={signedValue} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="childId" className="label">
              Enfant
            </label>
            <select id="childId" name="childId" required className="field">
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.avatar} {kid.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">Combien</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSign(1)}
                aria-pressed={sign === 1}
                className={cn(
                  "flex size-[52px] shrink-0 items-center justify-center rounded-2xl border-2 transition-colors",
                  sign === 1
                    ? "border-emerald-500 bg-emerald-500 text-emerald-950"
                    : "border-hud-700 bg-hud-800 text-hud-400 hover:text-white",
                )}
              >
                <Plus className="size-5" aria-hidden />
                <span className="sr-only">Ajouter des pièces</span>
              </button>

              <button
                type="button"
                onClick={() => setSign(-1)}
                aria-pressed={sign === -1}
                className={cn(
                  "flex size-[52px] shrink-0 items-center justify-center rounded-2xl border-2 transition-colors",
                  sign === -1
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-hud-700 bg-hud-800 text-hud-400 hover:text-white",
                )}
              >
                <Minus className="size-5" aria-hidden />
                <span className="sr-only">Retirer des pièces</span>
              </button>

              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="10"
                aria-label="Nombre de pièces"
                className="field"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="reason" className="label">
            Raison
          </label>
          <input
            id="reason"
            name="reason"
            required
            maxLength={120}
            placeholder="Ex. a aidé sans qu'on le demande"
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

        <button
          type="submit"
          disabled={pending || !amount}
          className={cn("w-full", sign === 1 ? "btn-primary" : "btn-danger")}
        >
          {sign === 1 ? "Ajouter" : "Retirer"} {amount || 0} pièces
        </button>
      </form>
    </section>
  );
}
