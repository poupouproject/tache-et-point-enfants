# Changesets

Ce dossier gère la version et le journal des changements de l'add-on avec
[Changesets](https://github.com/changesets/changesets).

## La règle

**Toute branche qui touche à `taches-et-points/` ajoute un changeset.** La CI le
vérifie (`.github/workflows/verifier-changeset.yml`) et refuse la pull request
sinon.

```bash
cd taches-et-points
npx changeset            # décrire le changement, choisir patch / minor / major
```

Committez le fichier `.md` créé ici avec le reste de la branche.

Pour un changement sans aucun effet visible (CI, refactor, dépendances
internes), la porte de sortie prévue est un changeset vide — il satisfait la
CI sans polluer le journal :

```bash
npx changeset add --empty
```

## Comment écrire l'entrée

Ce texte n'est pas un message de commit: il finit dans `CHANGELOG.md`, que
**Home Assistant affiche sur la page de l'add-on**. Il est lu par un parent qui
se demande s'il vaut la peine de mettre à jour.

- Écrire ce que la personne voit changer, pas comment c'est codé.
- Une phrase suffit. Pas de nom de fichier, pas de nom de fonction.
- Au présent, en français.

```
Bien: Les tâches d'un enfant masqué n'apparaissent plus sur le tableau.
Moins bien: Correction du filtre dans buildBoard (service.ts).
```

Choix du niveau :

| Niveau  | Quand                                                      |
| ------- | ---------------------------------------------------------- |
| `patch` | Correction, ajustement d'affichage                          |
| `minor` | Nouvelle capacité (un type de tâche, un écran, un réglage)   |
| `major` | Changement qui casse l'existant ou force une intervention   |

## Publier une version

Rien à lancer à la main: à chaque fusion sur `main`, la CI ouvre ou met à jour
la pull request **« Version de l'add-on »**, qui applique les changesets en
attente (`npm run version`: package.json + config.yaml + CHANGELOG.md).
Fusionner cette pull request publie l'image sous le nouveau tag, et Home
Assistant propose la mise à jour.

`npm run version` reste possible en local; régénérer alors le lockfile sous
Linux (voir `AGENTS.md`), parce qu'il porte lui aussi la version.

Home Assistant ne lit pas `package.json` — la version qui fait foi pour le
Supervisor est `version:` dans `config.yaml`, et c'est le tag publié sur GHCR.
`npm run version` recopie donc le numéro dans `config.yaml`
(`scripts/sync-addon-version.mjs`), pour qu'il n'y ait qu'un seul numéro à
faire évoluer.
