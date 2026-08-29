#!/usr/bin/env sh
# Démarrage de l'add-on.
#
# Tout l'état vit dans /data, le dossier persistant fourni par le Supervisor:
# il survit aux redémarrages et aux mises à jour, et il est inclus dans les
# sauvegardes Home Assistant.
set -eu

DATA_DIR="${DATA_DIR:-/data}"
OPTIONS_FILE="$DATA_DIR/options.json"

mkdir -p "$DATA_DIR"

# --- Fuseau horaire ---------------------------------------------------------
# Les journées et les semaines des tâches se calculent dans le fuseau de la
# famille: en UTC, une tâche confirmée en soirée compterait pour le lendemain.
if [ -f "$OPTIONS_FILE" ]; then
  OPTION_TZ="$(node -e "try{const o=require('$OPTIONS_FILE');process.stdout.write(o.timezone||'')}catch(e){}")"
  if [ -n "$OPTION_TZ" ]; then
    APP_TIMEZONE="$OPTION_TZ"
    TZ="$OPTION_TZ"
    export TZ
  fi
fi
APP_TIMEZONE="${APP_TIMEZONE:-America/Toronto}"
export APP_TIMEZONE

# --- Secret de session ------------------------------------------------------
# Généré une seule fois puis conservé: le régénérer à chaque démarrage
# déconnecterait tout le monde à la moindre mise à jour de l'add-on.
SECRET_FILE="$DATA_DIR/session_secret"
if [ ! -s "$SECRET_FILE" ]; then
  node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "[taches-et-points] nouveau secret de session généré"
fi
SESSION_SECRET="$(cat "$SECRET_FILE")"
export SESSION_SECRET

# --- Base de données --------------------------------------------------------
DATABASE_URL="file:$DATA_DIR/app.db"
export DATABASE_URL

echo "[taches-et-points] application des migrations…"
npx prisma migrate deploy --config prisma7.config.ts

echo "[taches-et-points] démarrage sur le port ${PORT:-3000} (fuseau $APP_TIMEZONE)"
exec npx next start --port "${PORT:-3000}" --hostname 0.0.0.0
