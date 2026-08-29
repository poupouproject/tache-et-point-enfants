import { Eye, EyeOff } from "lucide-react";

import { CoinCount } from "@/components/coin-count";
import { ChildForm } from "@/components/parent/child-form";
import { requireParent } from "@/lib/auth/session";
import { childColor } from "@/lib/constants";
import { balancesByChild } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { toggleChild } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  await requireParent();

  const [kids, balances] = await Promise.all([
    prisma.child.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    balancesByChild(),
  ]);

  return (
    <main className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3">
        <h2 className="font-hud text-base text-white">Enfants</h2>

        {kids.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="text-sm font-bold text-hud-400">
              Aucun enfant. Ajoutez-en un avec le formulaire.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {kids.map((kid) => {
              const colors = childColor(kid.color);

              return (
                <li
                  key={kid.id}
                  className={cn(
                    "panel flex items-center gap-3 border-l-8 p-4",
                    colors.border,
                    !kid.active && "opacity-50",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {kid.avatar}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{kid.name}</p>
                    <p className="text-xs text-hud-400">
                      {kid.active ? colors.label : "Masqué du tableau"}
                    </p>
                  </div>

                  <CoinCount value={balances.get(kid.id) ?? 0} size="sm" />

                  <form action={toggleChild}>
                    <input type="hidden" name="id" value={kid.id} />
                    <button
                      type="submit"
                      className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-hud-700 text-hud-400 transition-colors hover:border-amber-500 hover:text-amber-400"
                      aria-label={
                        kid.active
                          ? `Masquer ${kid.name}`
                          : `Réafficher ${kid.name}`
                      }
                    >
                      {kid.active ? (
                        <Eye className="size-4" aria-hidden />
                      ) : (
                        <EyeOff className="size-4" aria-hidden />
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <p className="px-1 text-xs text-hud-400">
          Un enfant se masque, ne se supprime pas: son historique de pièces
          reste intact.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-hud text-base text-white">Ajouter un enfant</h2>
        <ChildForm />
      </section>
    </main>
  );
}
