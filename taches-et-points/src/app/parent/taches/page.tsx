import { Eye, EyeOff, Pencil, Plus, Trash2, Users } from "lucide-react";
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

const ACTION =
  "inline-flex size-11 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors";

export default async function ParentTasksPage({
  searchParams,
}: PageProps<"/parent/taches">) {
  await requireParent();

  // Filtre choisi par les pastilles du haut: toutes, les familiales, ou ce
  // qu'un enfant doit faire (ses tâches et celles de chaque enfant).
  const { vue } = await searchParams;
  const view = typeof vue === "string" ? vue : "toutes";

  const [allTasks, kids] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
      include: {
        assignedChild: { select: { name: true, avatar: true, color: true } },
      },
    }),
    prisma.child.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, avatar: true, color: true },
    }),
  ]);

  const tasks = allTasks.filter((task) => {
    if (view === "toutes") return true;
    if (view === "famille") return task.type === "FAMILY";
    return task.type === "EACH" || task.assignedChildId === view;
  });

  const filters = [
    { key: "toutes", label: "Toutes", count: allTasks.length },
    {
      key: "famille",
      label: "Familiales",
      count: allTasks.filter((task) => task.type === "FAMILY").length,
    },
    ...kids.map((kid) => ({
      key: kid.id,
      label: `${kid.avatar} ${kid.name}`,
      count: allTasks.filter(
        (task) => task.type === "EACH" || task.assignedChildId === kid.id,
      ).length,
    })),
  ];

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-hud text-base text-white">Tâches</h2>
        <Link href="/parent/taches/nouvelle" className="btn-primary py-3 text-sm">
          <Plus className="size-5" aria-hidden />
          Nouvelle tâche
        </Link>
      </div>

      {/* Sur téléphone, les pastilles défilent à l'horizontale plutôt que de
          s'empiler sur trois lignes. */}
      <nav
        aria-label="Filtrer les tâches"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === "toutes" ? "/parent/taches" : `/parent/taches?vue=${filter.key}`}
            aria-current={view === filter.key ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
              view === filter.key
                ? "border-sky-500 bg-sky-500/15 text-white"
                : "border-hud-700 bg-hud-800 text-hud-200 hover:bg-hud-700",
            )}
          >
            {filter.label}
            <span className="rounded-full bg-hud-950/60 px-2 text-xs tabular-nums">
              {filter.count}
            </span>
          </Link>
        ))}
      </nav>

      {tasks.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-sm font-bold text-hud-400">
            Aucune tâche ici pour l&apos;instant.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={cn("panel min-w-0 p-4", !task.active && "opacity-50")}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-hud-700">
                  <TaskIcon name={task.icon} className="size-6 text-white" />
                </span>

                <p className="min-w-0 flex-1 self-center font-bold break-words text-white">
                  {task.title}
                </p>

                <CoinCount value={task.pointsValue} size="sm" className="shrink-0 self-center" />
              </div>

              <div className="mt-3 flex items-center gap-2 border-t-2 border-hud-800 pt-3">
                <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-hud-400">
                  <span className="chip bg-hud-700 text-hud-200">
                    {task.type === "EACH" && <Users className="size-3.5" aria-hidden />}
                    {TASK_TYPE_LABELS[task.type as TaskType] ?? task.type}
                  </span>
                  <span>{describeRecurrence(task)}</span>
                  {task.assignedChild && (
                    <span
                      className={cn("font-bold", childColor(task.assignedChild.color).text)}
                    >
                      {task.assignedChild.avatar} {task.assignedChild.name}
                    </span>
                  )}
                  {!task.active && <span className="font-bold">· masquée</span>}
                </p>

                <Link
                  href={`/parent/taches/${task.id}`}
                  className={cn(ACTION, "hover:border-sky-500 hover:text-sky-400")}
                  aria-label={`Modifier ${task.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>

                <form action={toggleTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <button
                    type="submit"
                    className={cn(ACTION, "hover:border-amber-500 hover:text-amber-400")}
                    aria-label={task.active ? `Masquer ${task.title}` : `Réafficher ${task.title}`}
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
                    className={cn(ACTION, "hover:border-rose-500 hover:text-rose-400")}
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
