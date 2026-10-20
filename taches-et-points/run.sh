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
    # Un fuseau inconnu ferait planter l'application: on le refuse ici, avec
    # un message lisible dans le journal de l'add-on.
    if TZ_CANDIDATE="$OPTION_TZ" node -e "new Intl.DateTimeFormat('en-CA',{timeZone:process.env.TZ_CANDIDATE})" 2>/dev/null; then
      APP_TIMEZONE="$OPTION_TZ"
      TZ="$OPTION_TZ"
      export TZ
    else
      echo "[taches-et-points] fuseau « $OPTION_TZ » inconnu, America/Toronto utilisé (exemple valide: America/Montreal)" >&2
    fi
  fi
fi
APP_TIMEZONE="${APP_TIMEZONE:-America/Toronto}"
export APP_TIMEZONE

# --- NIP imposés par Home Assistant ----------------------------------------
# Facultatifs. Remplis, ils font foi dans l'app (voir src/lib/auth/pins.ts):
# c'est la récupération d'un NIP oublié. Leur valeur n'est jamais écrite au
# journal.
pin_option() {
  [ -f "$OPTIONS_FILE" ] || return 0
  OPTION_NAME="$1" node -e "try{const o=require('$OPTIONS_FILE');process.stdout.write(String(o[process.env.OPTION_NAME]??'').trim())}catch(e){}"
}

ACCESS_PIN_OPTION="$(pin_option access_pin)"
PARENT_PIN_OPTION="$(pin_option parent_pin)"

if [ -n "$ACCESS_PIN_OPTION" ]; then
  if printf '%s' "$ACCESS_PIN_OPTION" | grep -Eq '^[0-9]{4,8}$'; then
    ACCESS_PIN="$ACCESS_PIN_OPTION"
    export ACCESS_PIN
    echo "[taches-et-points] NIP d'entrée géré par Home Assistant"
  else
    echo "[taches-et-points] option « NIP d'entrée » ignorée: il faut de 4 à 8 chiffres" >&2
  fi
fi

if [ -n "$PARENT_PIN_OPTION" ]; then
  if ! printf '%s' "$PARENT_PIN_OPTION" | grep -Eq '^[0-9]{4,8}$'; then
    echo "[taches-et-points] option « NIP parent » ignorée: il faut de 4 à 8 chiffres" >&2
  elif [ "$PARENT_PIN_OPTION" = "${ACCESS_PIN:-}" ]; then
    # Les enfants entreraient dans l'espace parents avec le NIP d'entrée.
    echo "[taches-et-points] option « NIP parent » ignorée: identique au NIP d'entrée" >&2
  else
    PARENT_PIN="$PARENT_PIN_OPTION"
    export PARENT_PIN
    echo "[taches-et-points] NIP parent géré par Home Assistant"
  fi
fi

# --- Home Assistant ---------------------------------------------------------
# Jeton qu'un rest_command de Home Assistant doit présenter pour approuver ou
# refuser une demande (POST /api/ha/decision). Généré une fois et conservé,
# comme le secret de session; affiché dans les réglages de l'app.
DECISION_TOKEN_FILE="$DATA_DIR/ha_decision_token"
if [ ! -s "$DECISION_TOKEN_FILE" ]; then
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" > "$DECISION_TOKEN_FILE"
  chmod 600 "$DECISION_TOKEN_FILE"
fi
HA_DECISION_TOKEN="$(cat "$DECISION_TOKEN_FILE")"
export HA_DECISION_TOKEN

# Nom sous lequel Home Assistant joint l'add-on (ex. ced7ebf3-taches-et-points),
# pour l'URL du rest_command. Lu avant que HOSTNAME serve à Next, plus bas.
ADDON_HOSTNAME="$(cat /etc/hostname 2>/dev/null || true)"
export ADDON_HOSTNAME

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
# Le CLI Prisma vit dans son propre arbre de modules: il ne sert qu'ici, et la
# sortie autonome de Next ne l'embarque pas. NODE_PATH est nécessaire parce que
# prisma7.config.ts, chargé depuis /app, importe dotenv — qui n'existe que dans
# cet arbre-là.
NODE_PATH=/app/migrator-modules/node_modules \
  ./migrator-modules/node_modules/.bin/prisma migrate deploy --config prisma7.config.ts

# Le serveur autonome lit PORT et HOSTNAME dans l'environnement.
PORT="${PORT:-3000}"
HOSTNAME=0.0.0.0
export PORT HOSTNAME

echo "[taches-et-points] démarrage sur le port $PORT (fuseau $APP_TIMEZONE)"
exec node server.js
