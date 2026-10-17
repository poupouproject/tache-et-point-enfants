import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { TaskForm } from "@/components/parent/task-form";
import { requireParent } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  await requireParent();

  const kids = await prisma.child.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, avatar: true },
  });

  return (
    <main className="mx-auto w-full max-w-2xl">
      <Link
        href="/parent/taches"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour aux tâches
      </Link>

      <h2 className="mb-5 font-hud text-base text-white">Nouvelle tâche</h2>

      <TaskForm kids={kids} />
    </main>
  );
}
