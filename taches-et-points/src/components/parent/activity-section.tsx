import { Banknote, ChevronDown, Gift } from "lucide-react";
import Link from "next/link";

import { CoinCount } from "@/components/coin-count";
import { UndoButton } from "@/components/parent/undo-button";
import type { ActivityDay, ActivityItem } from "@/lib/activity";
import { childColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ActivityView = "taches" | "recompenses";

const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-amber-500/15 text-amber-300" },
  FULFILLED: { label: "Donnée", className: "bg-emerald-500/15 text-emerald-300" },
  PAID: { label: "Payé", className: "bg-emerald-500/15 text-emerald-300" },
  REJECTED: { label: "Refusée", className: "bg-rose-500/15 text-rose-300" },
};

function href(view: ActivityView, childId: string | null) {
  const params = new URLSearchParams();
  if (view === "recompenses") params.set("activite", "recompenses");
  if (childId) params.set("enfant", childId);
  const query = params.toString();
  return `/parent${query ? `?${query}` : ""}#activite`;
}

function Pill({ active, href: to, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
        active
          ? "border-sky-500 bg-sky-500/15 text-white"
          : "border-hud-700 bg-hud-800 text-hud-200 hover:bg-hud-700",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Ce que les enfants ont fait et dépensé, jour par jour: aujourd'hui est
 * ouvert, les jours précédents repliés. Filtrable par enfant.
 */
export function ActivitySection({
  view,
  childId,
  kids,
  days,
}: {
  view: ActivityView;
  childId: string | null;
  kids: { id: string; name: string; avatar: string }[];
  days: ActivityDay[];
}) {
  return (
    <section id="activite" className="panel scroll-mt-4 p-5">
      <h2 className="font-hud text-base text-white">Activité</h2>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-hud-950/60 p-1">
        {(["taches", "recompenses"] as const).map((tab) => (
          <Link
            key={tab}
            href={href(tab, childId)}
            scroll={false}
            aria-current={view === tab ? "page" : undefined}
            className={cn(
              "rounded-xl px-3 py-2.5 text-center text-sm font-bold transition-colors",
              view === tab ? "bg-hud-700 text-white" : "text-hud-400 hover:text-white",
            )}
          >
            {tab === "taches" ? "Tâches faites" : "Récompenses et argent"}
          </Link>
        ))}
      </div>

      <nav
        aria-label="Filtrer par enfant"
        className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1"
      >
        <Pill active={!childId} href={href(view, null)}>
          Tous
        </Pill>
        {kids.map((kid) => (
          <Pill key={kid.id} active={childId === kid.id} href={href(view, kid.id)}>
            {kid.avatar} {kid.name}
          </Pill>
        ))}
      </nav>

      {view === "taches" && (
        <p className="mt-3 text-xs text-hud-400">
          Annuler retire les pièces et remet la tâche à faire.
        </p>
      )}

      {days.length === 0 ? (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-6 text-center text-sm font-bold text-hud-400">
          Rien depuis deux semaines
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {days.map((day, index) => (
            <details
              key={day.dateKey}
              open={index === 0}
              className="group rounded-2xl border-2 border-hud-800 bg-hud-950/40"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  className="size-5 shrink-0 -rotate-90 text-hud-400 transition-transform group-open:rotate-0"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 font-bold text-white first-letter:uppercase">
                  {day.label}
                </span>
                <span className="text-xs font-bold text-hud-400">
                  {day.items.length} {view === "taches" ? "tâche" : "demande"}
                  {day.items.length > 1 ? "s" : ""}
                </span>
                <span className={cn("font-hud text-xs tabular-nums", view === "taches" ? "text-emerald-400" : "text-rose-400")}>
                  {view === "taches" ? "+" : "−"}
                  {day.total}
                </span>
              </summary>

              <ul className="divide-y divide-hud-800 border-t-2 border-hud-800 px-4">
                {day.items.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const color = childColor(item.child.color);

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="text-xl" aria-hidden>
        {item.child.avatar}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold break-words text-white">
          {item.kind === "reward" && <Gift className="mr-1.5 inline size-4 text-violet-400" aria-hidden />}
          {item.kind === "money" && <Banknote className="mr-1.5 inline size-4 text-emerald-400" aria-hidden />}
          {item.title}
        </p>
        <p className="text-xs text-hud-400">
          <span className={cn("font-bold", color.text)}>{item.child.name}</span> · {item.time}
          {item.kind !== "task" && STATUS[item.status] && (
            <span className={cn("chip ml-2", STATUS[item.status].className)}>
              {STATUS[item.status].label}
            </span>
          )}
        </p>
      </div>

      <CoinCount value={item.points} size="sm" />

      {item.kind === "task" && (
        <UndoButton
          completionId={item.id}
          title={item.title}
          childName={item.child.name}
          points={item.points}
        />
      )}
    </li>
  );
}
