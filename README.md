# Quêtes & Pièces

Application de tâches et de points pour les enfants, à héberger à la maison.
Les enfants confirment eux-mêmes leurs tâches sur un écran partagé, gagnent des
« pièces », et les échangent contre des récompenses ou de l'argent réel.

Empaquetée comme **add-on Home Assistant**, mais accessible directement par une
URL locale (`http://<ip-ha>:3000`) sans passer par Home Assistant — pas de
panneau dans la barre latérale, c'est un NIP qui protège l'accès.

## Ce que ça fait

- **Tableau de bord familial** — une carte par enfant, avec son solde, sa série
  de jours consécutifs et ses quêtes du jour. Tout tient sur un écran.
- **Deux sortes de tâches** — *familiales* (n'importe qui peut la prendre,
  premier arrivé premier servi) et *individuelles* (assignées à un enfant).
- **Récurrences** — tous les jours, certains jours de la semaine, une fois par
  semaine, ou une seule fois. Aucune tâche à réinitialiser à la main.
- **Confiance par défaut** — confirmer une tâche crédite les pièces tout de
  suite; un parent peut annuler après coup.
- **Boutique et argent** — récompenses achetables en pièces, et conversion en
  dollars au taux de votre choix. Les deux passent par une approbation parent.
- **Espace parents** — protégé par un second NIP: tâches, enfants, récompenses,
  ajustements manuels, approbations et réglages.

## Comment c'est construit

Next.js 16 (App Router) · Prisma 7 · SQLite · Tailwind v4 · TypeScript.

Quelques décisions qui expliquent le reste du code :

- **Le solde n'est jamais stocké.** Toute variation de pièces est une ligne
  dans la table `Transaction`, en ajout seulement, et un solde est toujours une
  somme. Annuler une tâche n'efface pas le gain: ça ajoute une écriture
  inverse. Sur un sujet qui finit en argent réel, l'historique doit rester
  vérifiable.
- **Les occurrences ne sont pas générées à l'avance.** Une tâche a une
  `periodKey` calculée à l'affichage (le jour, la semaine ISO…). Quand la
  période change, la clé change et la tâche redevient disponible — sans cron ni
  job de réinitialisation.
- **La course est arbitrée par la base.** Deux enfants qui tapent la même tâche
  familiale en même temps sont départagés par une contrainte unique
  `(taskId, periodKey)`, pas par une vérification préalable. C'est la seule
  façon fiable de trancher deux clics simultanés.
- **Les journées sont calculées dans le fuseau de la famille**, pas en UTC:
  sinon une tâche confirmée à 20 h compterait pour le lendemain.

## Développement

```bash
cd taches-et-points
npm install
npx prisma migrate deploy
npm run dev
```

Il faut un fichier `.env` avec au minimum `DATABASE_URL` et `SESSION_SECRET`
(voir le tableau plus bas).

Ouvrir http://localhost:3000 — au premier lancement, l'application demande de
choisir les deux NIP.

Pour repartir d'un jeu de données d'exemple (deux enfants, des tâches, des
récompenses) :

```bash
npm run db:seed             # NIP 1234 (entrée) et 9999 (parent)
```

### Tests

```bash
npm test
```

Les tests tournent contre une vraie base SQLite jetable et couvrent ce qui doit
absolument être correct: l'arbitrage des tâches familiales (y compris deux
confirmations vraiment simultanées), l'annulation par un parent, le calcul des
récurrences, et l'impossibilité de dépenser deux fois les mêmes pièces.

### Après un `npm install` sous Windows ou macOS

Régénérer le lockfile dans un conteneur Linux :

```bash
docker run --rm -v "$PWD:/app" -w /app node:24-bookworm-slim \
  npm install --package-lock-only --ignore-scripts
```

npm n'inscrit dans `package-lock.json` que les dépendances optionnelles de la
plateforme courante. Un lockfile produit sous Windows n'a donc pas les binaires
natifs Linux (ceux de Tailwind, notamment), et le `npm ci` de l'image Docker
échoue avec « package.json and package-lock.json are not in sync ».

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Fichier SQLite, ex. `file:./dev.db` |
| `SESSION_SECRET` | Clé de signature des sessions, 32 caractères minimum |
| `APP_TIMEZONE` | Fuseau pour le calcul des journées (défaut `America/Toronto`) |

Générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Dans l'add-on, ces trois variables sont gérées automatiquement par `run.sh`.

## Installation comme add-on Home Assistant

1. Dans Home Assistant : **Paramètres → Modules complémentaires → Boutique →
   ⋮ → Dépôts**, ajouter l'URL de ce dépôt Git.
2. Installer **Quêtes & Pièces** dans la liste, puis démarrer.
3. Ouvrir `http://<ip-de-home-assistant>:3000` et choisir les deux NIP.

Options de l'add-on : `timezone` (fuseau de la famille) et `log_level`.

Pour construire et essayer l'image sans Home Assistant :

```bash
cd taches-et-points
docker build --build-arg BUILD_FROM=node:24-bookworm-slim -t taches-et-points .
docker run -d -v tepdata:/data -p 3000:3000 taches-et-points
```

### Publication des images

Le Supervisor **télécharge** l'image, il ne la construit pas: `config.yaml`
porte une clé `image:`, et compiler Next.js sur le matériel Home Assistant
serait long (très long sur un Raspberry Pi).

Les images sont produites par `.github/workflows/publier-addon.yml`, à chaque
poussée sur `main`, vers `ghcr.io/poupouproject/taches-et-points-{arch}`. Chaque
architecture est construite sur un runner de la même architecture: émuler l'ARM
en QEMU multiplierait la durée du build.

**Pour livrer une mise à jour**, incrémenter `version:` dans
`taches-et-points/config.yaml`. C'est ce numéro que le Supervisor cherche comme
tag, et c'est lui qui déclenche le bouton « Mettre à jour » dans Home Assistant.

**Au tout premier passage**, rendre les deux paquets GHCR publics (Profil
GitHub → Packages → `taches-et-points-amd64` puis `-aarch64` → Package settings
→ Change visibility → Public). Sans ça, Home Assistant ne peut pas les
télécharger: il n'est pas authentifié auprès de GHCR.

À savoir :

- **Le dépôt doit être public.** Le Supervisor n'a pas de support propre pour un
  dépôt GitHub privé comme boutique d'add-ons.
- **Pas d'ingress, port direct.** L'add-on expose le port 3000 et n'apparaît pas
  dans la barre latérale: c'est voulu, et c'est le NIP qui protège l'accès.
  Comme l'application est servie en HTTP sur le réseau local, ne l'exposez pas
  sur Internet telle quelle.
- **Les données vivent dans `/data`**, le dossier persistant de l'add-on: elles
  survivent aux redémarrages et aux mises à jour, et sont incluses dans les
  sauvegardes Home Assistant. Le secret de session y est généré une fois puis
  conservé, pour ne pas déconnecter tout le monde à chaque mise à jour.

## Structure

```
repository.yaml            Déclare le dépôt comme boutique d'add-ons HA
taches-et-points/          L'add-on (= le contexte de build Docker)
  config.yaml              Manifeste: port direct, pas d'ingress, /data
  build.yaml               Images de base par architecture
  Dockerfile               Build Next.js multi-étapes
  run.sh                   Démarrage: fuseau, secret, migrations, serveur
  prisma/schema.prisma     Modèle de données
  src/lib/                 Logique métier (ledger, récurrences, session)
  src/app/                 Pages et Server Actions
  tests/                   Tests de la logique métier
```

L'application vit dans le sous-dossier `taches-et-points/` parce que le
Supervisor construit chaque add-on en utilisant **son propre dossier** comme
contexte Docker.
