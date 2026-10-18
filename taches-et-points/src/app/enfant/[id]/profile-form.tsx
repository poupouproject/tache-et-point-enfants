"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { AVATARS, CHILD_COLOR_KEYS, childColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { saveProfile, type ProfileState } from "./actions";

/**
 * Choix de l'avatar et de la couleur, avec un aperçu de la carte en direct:
 * l'enfant voit tout de suite à quoi ressemblera la sienne au tableau.
 */
export function ProfileForm({
  child,
}: {
  child: { id: string; name: string; avatar: string; color: string };
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    {},
  );
  const [avatar, setAvatar] = useState(child.avatar);
  const [color, setColor] = useState(child.color);
  const colors = childColor(color);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="childId" value={child.id} />
      <input type="hidden" name="avatar" value={avatar} />
      <input type="hidden" name="color" value={color} />

      {/* Aperçu de la carte. */}
      <div
        className={cn(
          "panel flex items-center gap-4 border-t-8 p-5",
          colors.border,
        )}
      >
        <span
          className={cn(
            "flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl shadow-lg",
            colors.gradient,
            colors.glow,
          )}
          aria-hidden
        >
          {avatar}
        </span>
        <div>
          <h1 className="font-hud text-lg text-white">{child.name}</h1>
          <p className="mt-2 text-sm font-bold text-hud-400">Ma carte</p>
        </div>
      </div>

      <section className="panel p-5">
        <h2 className="label">Mon avatar</h2>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {AVATARS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAvatar(option)}
              aria-label={`Avatar ${option}`}
              aria-pressed={avatar === option}
              className={cn(
                "flex aspect-square items-center justify-center rounded-2xl border-2 text-3xl transition-colors",
                avatar === option
                  ? cn("bg-hud-700", colors.border)
                  : "border-hud-700 bg-hud-800 hover:bg-hud-700",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="label">Ma couleur</h2>
        <div className="grid grid-cols-6 gap-3">
          {CHILD_COLOR_KEYS.map((key) => {
            const option = childColor(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                aria-label={option.label}
                aria-pressed={color === key}
                className={cn(
                  "h-14 rounded-2xl ring-offset-4 ring-offset-hud-900 transition-transform",
                  option.bg,
                  color === key ? cn("scale-105 ring-4", option.ring) : "opacity-70 hover:opacity-100",
                )}
              />
            );
          })}
        </div>
      </section>

      {state.error && (
        <p
          role="alert"
          className="animate-pop-in rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          "C'est ma carte !"
        )}
      </button>
    </form>
  );
}
