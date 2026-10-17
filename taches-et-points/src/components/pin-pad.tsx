"use client";

import { Delete, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { cn } from "@/lib/utils";

type PinState = { error?: string };

/**
 * Pavé numérique tactile. Le NIP voyage dans un champ caché: le clavier à
 * l'écran est la seule saisie prévue (on est sur un kiosque, souvent sans
 * clavier physique).
 */
export function PinPad({
  action,
  title,
  subtitle,
  submitLabel,
  accent = "emerald",
}: {
  action: (prev: PinState, formData: FormData) => Promise<PinState>;
  title: string;
  subtitle?: string;
  submitLabel: string;
  accent?: "emerald" | "amber";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [pin, setPin] = useState("");

  const push = (digit: string) => {
    if (pin.length < 8) setPin(pin + digit);
  };

  const accentClasses =
    accent === "amber"
      ? "border-coin-dark bg-coin text-amber-950 hover:bg-amber-300"
      : "border-emerald-800 bg-emerald-500 text-emerald-950 hover:bg-emerald-400";

  return (
    <form action={formAction} className="panel w-full max-w-sm p-6 sm:p-8">
      <input type="hidden" name="pin" value={pin} />

      <h1 className="text-center font-hud text-lg leading-relaxed text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-center text-sm text-hud-400">{subtitle}</p>
      )}

      {/* Les chiffres saisis, en pastilles — jamais le NIP en clair. */}
      <div
        className="mt-6 flex justify-center gap-3"
        role="status"
        aria-label={`${pin.length} chiffre${pin.length > 1 ? "s" : ""} saisi${pin.length > 1 ? "s" : ""}`}
      >
        {Array.from({ length: Math.max(4, pin.length) }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "size-4 rounded-full border-2 transition-colors",
              index < pin.length
                ? "border-transparent bg-coin"
                : "border-hud-600 bg-transparent",
            )}
          />
        ))}
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-4 animate-pop-in rounded-2xl bg-rose-500/15 px-4 py-3 text-center text-sm font-bold text-rose-300"
        >
          {state.error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => push(digit)}
            className="btn-secondary py-5 font-hud text-xl"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setPin("")}
          className="btn-secondary py-5 text-sm"
          aria-label="Tout effacer"
        >
          C
        </button>

        <button
          type="button"
          onClick={() => push("0")}
          className="btn-secondary py-5 font-hud text-xl"
        >
          0
        </button>

        <button
          type="button"
          onClick={() => setPin(pin.slice(0, -1))}
          className="btn-secondary py-5"
          aria-label="Effacer un chiffre"
        >
          <Delete className="size-5" aria-hidden />
        </button>
      </div>

      <button
        type="submit"
        disabled={pin.length < 4 || pending}
        className={cn("btn-3d mt-6 w-full", accentClasses)}
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
