import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUnlocked } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

/**
 * Page de profil d'un enfant: il y choisit lui-même son avatar et sa couleur.
 * Ouverte sans NIP parent — le kiosque déverrouillé suffit —, d'où les limites
 * posées par updateChildProfile (listes fermées, enfant actif).
 */
export default async function ChildProfilePage({
  params,
}: PageProps<"/enfant/[id]">) {
  await requireUnlocked();

  // Next 16: les params de route sont asynchrones.
  const { id } = await params;

  // Un enfant désactivé n'a plus de carte au tableau: sa page ne doit pas
  // rester joignable par l'URL.
  const child = await prisma.child.findUnique({ where: { id } });
  if (!child || !child.active) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour au tableau
      </Link>

      <ProfileForm
        child={{
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          color: child.color,
        }}
      />
    </main>
  );
}
