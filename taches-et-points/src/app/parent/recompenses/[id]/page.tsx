import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RewardForm } from "@/components/parent/reward-form";
import { requireParent } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditRewardPage({
  params,
}: PageProps<"/parent/recompenses/[id]">) {
  await requireParent();

  const { id } = await params;
  const reward = await prisma.reward.findUnique({ where: { id } });
  if (!reward) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl">
      <Link
        href="/parent/recompenses"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour aux récompenses
      </Link>

      <h2 className="mb-5 font-hud text-base text-white">Modifier la récompense</h2>

      <RewardForm reward={reward} />
    </main>
  );
}
