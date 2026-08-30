# Conventions du dépôt

Add-on Home Assistant « Quêtes & Pièces ». L'application vit dans
`taches-et-points/` parce que le Supervisor construit chaque add-on en utilisant
**son propre dossier** comme contexte Docker.

## Toute branche qui touche à l'add-on ajoute un changeset

```bash
cd taches-et-points
npx changeset               # patch / minor / major, puis la description
```

Le fichier créé dans `.changeset/` se committe avec le reste de la branche. La
CI refuse la pull request sans lui. Si le changement n'a aucun effet visible
(CI, refactor, dépendances) : `npx changeset add --empty`.

L'entrée est lue par un parent sur la page de mise à jour de Home Assistant, pas
par un développeur : décrire ce qui change à l'écran, en une phrase, sans nom de
fichier. Voir `taches-et-points/.changeset/README.md`.

## Deux versions, un seul geste

`config.yaml` porte la version que le Supervisor lit et que la CI publie comme
tag GHCR ; `package.json` porte celle que Changesets connaît. `npm run version`
met les deux à jour ensemble — ne jamais les modifier à la main séparément.

## Après un `npm install` sous Windows ou macOS

Régénérer le lockfile dans un conteneur Linux, sinon le `npm ci` de l'image
échoue :

```bash
docker run --rm -v "$PWD:/app" -w /app node:24-bookworm-slim \
  npm install --package-lock-only --ignore-scripts
```

npm n'inscrit que les dépendances optionnelles de la plateforme courante.

## Avant de proposer une branche

```bash
cd taches-et-points
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

Les tests tournent contre une vraie base SQLite jetable. Ils couvrent ce qui
touche à l'argent : arbitrage des tâches familiales, annulation par un parent,
récurrences, double dépense. Un changement dans `src/lib/` en mérite un.

## Ce que le code protège

- **Le solde n'est jamais stocké** : toute variation est une ligne append-only
  dans `Transaction`, un solde est une somme. Annuler ajoute une écriture
  inverse, on n'efface pas un gain.
- **Les occurrences ne sont pas générées à l'avance** : une `periodKey` est
  calculée à l'affichage. Changer la récurrence d'une tâche impose de remapper
  les complétions (`remapCompletionPeriods`), sinon une tâche déjà payée
  redevient à faire.
- **Les Server Actions sont joignables par POST direct** : chacune refait le
  contrôle de session (`requireUnlocked` / `requireParent`). Le `proxy.ts` ne
  vérifie que la présence du cookie, pas sa validité — ce n'est pas de la
  sécurité.
- **Les journées sont calculées dans le fuseau de la famille**, pas en UTC.
