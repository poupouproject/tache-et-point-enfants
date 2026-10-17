import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { CoinCount } from "@/components/coin-count";
import { TaskIcon } from "@/components/icons";
import { requireParent } from "@/lib/auth/session";
import { childColor, TASK_TYPE_LABELS, type TaskType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { describeRecurrence } from "@/lib/tasks/due";
import { cn } from "@/lib/utils";

import { deleteTask, toggleTask } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParentTasksPage() {
  await requireParent();

  const tasks = await prisma.task.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
    include: {
      assignedChild: { select: { name: true, avatar: true, color: true } },
    },
  });

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-hud text-base text-white">Tâches</h2>
        <Link href="/parent/taches/nouvelle" className="btn-primary py-3 text-sm">
          <Plus className="size-5" aria-hidden />
          Nouvelle tâche
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-sm font-bold text-hud-400">
            Aucune tâche pour l&apos;instant.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={cn(
                "panel flex flex-wrap items-center gap-3 p-4",
                !task.active && "opacity-50",
              )}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-hud-700">
                <TaskIcon name={task.icon} className="size-6 text-white" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{task.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-hud-400">
                  <span className="chip bg-hud-700 text-hud-200">
                    {TASK_TYPE_LABELS[task.type as TaskType] ?? task.type}
                  </span>
                  <span>{describeRecurrence(task)}</span>
                  {task.assignedChild && (
                    <span
                      className={cn(
                        "font-bold",
                        childColor(task.assignedChild.color).text,
                      )}
                    >
                      {task.assignedChild.avatar} {task.assignedChild.name}
                    </span>
                  )}
                </p>
              </div>

              <CoinCount value={task.pointsValue} size="sm" />

              <div className="flex gap-2">
                <Link
                  href={`/parent/taches/${task.id}`}
                  className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-sky-500 hover:text-sky-400"
                  aria-label={`Modifier ${task.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>

                <form action={toggleTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <button
                    type="submit"
                    className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-amber-500 hover:text-amber-400"
                    aria-label={
                      task.active
                        ? `Masquer ${task.title}`
                        : `Réafficher ${task.title}`
                    }
                  >
                    {task.active ? (
                      <Eye className="size-4" aria-hidden />
                    ) : (
                      <EyeOff className="size-4" aria-hidden />
                    )}
                  </button>
                </form>

                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <button
                    type="submit"
                    className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-rose-500 hover:text-rose-400"
                    aria-label={`Supprimer ${task.title}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
