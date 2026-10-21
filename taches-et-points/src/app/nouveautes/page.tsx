import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

import { readReleases } from "@/lib/changelog";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RELEASES_URL = "https://github.com/poupouproject/tache-et-point-enfants/releases";

/**
 * Ce qui a changé, version par version: le même texte que la page de mise à
 * jour de Home Assistant. Accessible sans NIP: il n'y a rien de privé.
 */
export default async function ReleaseNotesPage() {
  const releases = await readReleases();
  const current = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour
      </Link>

      <h1 className="flex items-center gap-3 font-hud text-lg text-white">
        <Sparkles className="size-6 text-coin" aria-hidden />
        Nouveautés
      </h1>

      {releases.length === 0 ? (
        <p className="panel mt-5 p-6 text-sm text-hud-400">Le journal des versions est introuvable.</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {releases.map((release) => (
            <li
              key={release.version}
              className={cn("panel p-5", release.version === current && "border-sky-500")}
            >
              <h2 className="flex flex-wrap items-center gap-3 font-hud text-sm text-white">
                {release.version}
                {release.version === current && (
                  <span className="chip bg-sky-500/15 text-sky-300">Installée</span>
                )}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-hud-200">
                {release.entries.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-hud-400 transition-colors hover:text-white"
      >
        Toutes les versions sur GitHub
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </main>
  );
}
