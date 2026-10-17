/**
 * Générateur d'entrées de CHANGELOG.md.
 *
 * Le journal est lu par un parent sur la page de mise à jour de Home Assistant.
 * Le générateur par défaut de Changesets préfixe chaque entrée de l'identifiant
 * du commit (« - a71ed36: ... »): utile à un développeur, du bruit pour ce
 * lecteur-là. On n'écrit donc que la phrase du changeset.
 *
 * Les titres « ### Patch Changes » sont ajoutés par Changesets lui-même, hors
 * de portée d'un générateur: scripts/sync-addon-version.mjs les retire.
 */

/** Une entrée par changeset, sans identifiant de commit. */
async function getReleaseLine(changeset) {
  const [first, ...rest] = changeset.summary
    .trim()
    .split("\n")
    .map((line) => line.trimEnd());

  return [`- ${first}`, ...rest.map((line) => `  ${line}`)].join("\n");
}

/** Un seul paquet dans le dépôt: aucune dépendance interne à annoncer. */
async function getDependencyReleaseLine() {
  return "";
}

const changelogFunctions = { getReleaseLine, getDependencyReleaseLine };

export default changelogFunctions;
