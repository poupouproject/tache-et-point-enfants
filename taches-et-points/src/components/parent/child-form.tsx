"use client";

import { useActionState, useState } from "react";

import { saveChild, type FormState } from "@/app/parent/actions";
import { AVATARS, CHILD_COLOR_KEYS, childColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ChildForm({
  child,
}: {
  child?: { id: string; name: string; avatar: string; color: string };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveChild,
    {},
  );
  const [avatar, setAvatar] = useState(child?.avatar ?? "🦊");
  const [color, setColor] = useState(child?.color ?? "blue");

  return (
    <form action={formAction} className="panel space-y-5 p-5">
      {child?.id && <input type="hidden" name="id" value={child.id} />}
      <input type="hidden" name="avatar" value={avatar} />
      <input type="hidden" name="color" value={color} />

      <div>
        <label htmlFor={`name-${child?.id ?? "new"}`} className="label">
          Prénom
        </label>
        <input
          id={`name-${child?.id ?? "new"}`}
          name="name"
          required
          maxLength={40}
          defaultValue={child?.name}
          className="field"
        />
      </div>

      <div>
        <span className="label">Avatar</span>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAvatar(option)}
              aria-pressed={avatar === option}
              aria-label={`Avatar ${option}`}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border-2 text-2xl transition-colors",
                avatar === option
                  ? "border-sky-500 bg-sky-500/20"
                  : "border-hud-700 bg-hud-800 hover:border-hud-600",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Couleur</span>
        <div className="flex flex-wrap gap-2">
          {CHILD_COLOR_KEYS.map((key) => {
            const colors = childColor(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                aria-pressed={color === key}
                aria-label={colors.label}
                className={cn(
                  "size-12 rounded-xl border-4 transition-transform",
                  colors.bg,
                  color === key
                    ? "border-white scale-110"
                    : "border-transparent hover:scale-105",
                )}
              />
            );
          })}
        </div>
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
        {child?.id ? "Enregistrer" : "Ajouter l'enfant"}
      </button>
    </form>
  );
}
