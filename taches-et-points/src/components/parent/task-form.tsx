"use client";

import { useActionState, useState } from "react";

import { saveTask, type FormState } from "@/app/parent/actions";
import { TaskIcon, TASK_ICON_KEYS } from "@/components/icons";
import {
  RECURRENCE_LABELS,
  RECURRENCES,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  WEEKDAY_LABELS,
  type Recurrence,
  type TaskType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type Kid = { id: string; name: string; avatar: string };

type TaskDefaults = {
  id?: string;
  title?: string;
  description?: string | null;
  icon?: string;
  type?: string;
  pointsValue?: number;
  recurrence?: string;
  weekdays?: string | null;
  assignedChildId?: string | null;
};

export function TaskForm({
  kids,
  task,
}: {
  kids: Kid[];
  task?: TaskDefaults;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveTask,
    {},
  );

  // Ces trois états pilotent l'affichage conditionnel du formulaire, donc ils
  // sont contrôlés côté client même si la validation refait tout côté serveur.
  const [type, setType] = useState<TaskType>((task?.type as TaskType) ?? "FAMILY");
  const [recurrence, setRecurrence] = useState<Recurrence>(
    (task?.recurrence as Recurrence) ?? "DAILY",
  );
  const [icon, setIcon] = useState(task?.icon ?? "star");

  const selectedDays = (task?.weekdays ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  return (
    <form action={formAction} className="panel space-y-5 p-5">
      {task?.id && <input type="hidden" name="id" value={task.id} />}
      <input type="hidden" name="icon" value={icon} />

      <div>
        <label htmlFor="title" className="label">
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={80}
          defaultValue={task?.title}
          placeholder="Ex. vider le lave-vaisselle"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Détails (facultatif)
        </label>
        <input
          id="description"
          name="description"
          maxLength={200}
          defaultValue={task?.description ?? ""}
          className="field"
        />
      </div>

      <div>
        <span className="label">Icône</span>
        <div className="flex flex-wrap gap-2">
          {TASK_ICON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={`Icône ${key}`}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border-2 transition-colors",
                icon === key
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-hud-700 bg-hud-800 text-hud-400 hover:text-white",
              )}
            >
              <TaskIcon name={key} className="size-5" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pointsValue" className="label">
            Pièces gagnées
          </label>
          <input
            id="pointsValue"
            name="pointsValue"
            type="number"
            min={1}
            max={1000}
            required
            defaultValue={task?.pointsValue ?? 10}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="type" className="label">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as TaskType)}
            className="field"
          >
            {TASK_TYPES.map((value) => (
              <option key={value} value={value}>
                {TASK_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-hud-400">
            {type === "FAMILY"
              ? "Tout le monde la voit, le premier qui la fait gagne les pièces."
              : "Assignée à un seul enfant."}
          </p>
        </div>
      </div>

      {type === "INDIVIDUAL" && (
        <div>
          <label htmlFor="assignedChildId" className="label">
            Pour qui
          </label>
          <select
            id="assignedChildId"
            name="assignedChildId"
            required
            defaultValue={task?.assignedChildId ?? ""}
            className="field"
          >
            <option value="">Choisir…</option>
            {kids.map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.avatar} {kid.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="recurrence" className="label">
          Quand
        </label>
        <select
          id="recurrence"
          name="recurrence"
          value={recurrence}
          onChange={(event) =>
            setRecurrence(event.target.value as Recurrence)
          }
          className="field"
        >
          {RECURRENCES.map((value) => (
            <option key={value} value={value}>
              {RECURRENCE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {recurrence === "WEEKDAYS" && (
        <fieldset>
          <legend className="label">Quels jours</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <label
                key={index}
                className="cursor-pointer"
                aria-label={label}
              >
                <input
                  type="checkbox"
                  name="weekdays"
                  value={index}
                  defaultChecked={selectedDays.includes(index)}
                  className="peer sr-only"
                />
                <span className="flex size-12 items-center justify-center rounded-xl border-2 border-hud-700 bg-hud-800 text-sm font-bold text-hud-400 transition-colors peer-checked:border-sky-500 peer-checked:bg-sky-500 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.error && (
        <p role="alert" className="text-sm font-bold text-rose-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {task?.id ? "Enregistrer" : "Créer la tâche"}
      </button>
    </form>
  );
}
