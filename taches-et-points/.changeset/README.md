# Changesets

Ce dossier gère le versionnage de l'add-on avec
[Changesets](https://github.com/changesets/changesets).

## Le lien avec la version de l'add-on

Home Assistant ne lit pas `package.json`: la version qui fait foi pour le
Supervisor est `version:` dans `config.yaml`, et c'est le tag que la CI publie
sur GHCR. Pour ne pas avoir deux versions à tenir à jour, `npm run version`
applique les changesets à `package.json` **puis** recopie ce numéro dans
`config.yaml` (voir `scripts/sync-addon-version.mjs`). Il n'y a donc qu'un seul
geste à faire.

## Au quotidien

1. Après un changement notable : `npm run changeset`, choisir `patch` / `minor`
   / `major`, décrire ce qui change (ce texte finit dans le CHANGELOG).
2. Committer le fichier `.md` créé ici, avec le reste du changement.
3. Pour préparer une publication : `npm run version` (met à jour la version,
   `config.yaml` et `CHANGELOG.md`), committer, fusionner sur `main`. La CI
   publie alors l'image sous le nouveau tag.
