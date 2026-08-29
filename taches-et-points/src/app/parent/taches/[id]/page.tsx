import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TaskForm } from "@/components/parent/task-form";
import { requireParent } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({
  params,
}: PageProps<"/parent/taches/[id]">) {
  await requireParent();

  const { id } = await params;

  const [task, kids] = await Promise.all([
    prisma.task.findUnique({ where: { id } }),
    prisma.child.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, avatar: true },
    }),
  ]);

  if (!task) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl">
      <Link
        href="/parent/taches"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour aux tâches
      </Link>

      <h2 className="mb-5 font-hud text-base text-white">Modifier la tâche</h2>

      <TaskForm kids={kids} task={task} />
    </main>
  );
}
