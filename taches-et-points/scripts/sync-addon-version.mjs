/**
 * Recopie la version de package.json dans config.yaml.
 *
 * Changesets ne connaît que package.json, mais c'est `version:` dans
 * config.yaml que le Supervisor lit et que la CI publie comme tag GHCR. Ce
 * script, appelé après `changeset version`, garde les deux alignés — pour qu'il
 * n'y ait qu'un seul numéro à faire évoluer.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const pkgPath = join(root, "package.json");
const configPath = join(root, "config.yaml");

const version = JSON.parse(readFileSync(pkgPath, "utf8")).version;
if (!version) {
  console.error("Aucune version dans package.json");
  process.exit(1);
}

const config = readFileSync(configPath, "utf8");

// La ligne `version:` de config.yaml, quel que soit le style de guillemets.
const versionLine = /^version:\s*"?[^"\n]+"?\s*$/m;
if (!versionLine.test(config)) {
  console.error("Ligne `version:` introuvable dans config.yaml");
  process.exit(1);
}

const updated = config.replace(versionLine, `version: "${version}"`);

if (updated === config) {
  console.log(`config.yaml déjà à la version ${version}`);
} else {
  writeFileSync(configPath, updated);
  console.log(`config.yaml -> ${version}`);
}
