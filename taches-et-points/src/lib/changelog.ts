import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Le journal des versions (CHANGELOG.md, écrit par Changesets), pour la page
 * « Nouveautés ». Lu dans l'image plutôt que sur GitHub: la page fonctionne
 * sans Internet, et un lien externe ferait sortir de l'app installée.
 */

export type Release = { version: string; entries: string[] };

/**
 * Format attendu: « ## 1.5.2 », puis des puces « - … » dont les lignes
 * suivantes sont indentées. Un paragraphe hors puce devient une entrée.
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let current: Release | null = null;
  let entry: string[] = [];

  const flush = () => {
    if (current && entry.length) current.entries.push(entry.join(" "));
    entry = [];
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = /^##\s+(\S+)/.exec(line);
    if (heading) {
      flush();
      current = { version: heading[1], entries: [] };
      releases.push(current);
    } else if (!current || line.startsWith("#")) {
      continue;
    } else if (line.startsWith("- ")) {
      flush();
      entry.push(line.slice(2).trim());
    } else if (line.trim() === "") {
      flush();
    } else {
      entry.push(line.trim());
    }
  }
  flush();
  return releases;
}

export async function readReleases(): Promise<Release[]> {
  try {
    return parseChangelog(await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8"));
  } catch {
    return [];
  }
}
