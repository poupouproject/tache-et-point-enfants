#!/usr/bin/env bash
# Porte d'entrée de « Prêt à publier » (voir pret-a-publier.yml).
# Exécutée une à la fois (concurrency): la lecture et la prise du verrou ne
# peuvent pas se croiser entre deux pull requests.
#
# Écrit dans $GITHUB_OUTPUT: go=true|false, pr, branche.
set -euo pipefail
# shellcheck source=labels.sh
source "$(dirname "$0")/labels.sh"

repo="$GITHUB_REPOSITORY"
pr="$PR_INPUT"
out() { echo "$1=$2" >> "$GITHUB_OUTPUT"; }
out go false
out pr "$pr"

view="$(gh pr view "$pr" --repo "$repo" --json state,isDraft,labels,headRefOid,headRefName,baseRefName,isCrossRepository)"
field() { jq -r "$1" <<< "$view"; }
sha="$(field .headRefOid)"
has_label() { jq -e --arg l "$1" '.labels | map(.name) | index($l)' <<< "$view" > /dev/null; }

status() {
  gh api "repos/$repo/statuses/$sha" -f state="$1" -f context="$STATUS" -f description="$2" > /dev/null
  echo "Statut « $STATUS »: $1 — $2"
}

release_lock_if_held() {
  if has_label "$LOCK"; then
    label_remove "$pr" "$LOCK"
    echo "Verrou libéré."
    bash "$(dirname "$0")/suivante.sh"
  fi
}

# --- Événements qui ne lancent pas de préparation ---------------------------

if [ "$EVENT" = "pull_request" ]; then
  case "$ACTION" in
    closed)
      release_lock_if_held
      exit 0
      ;;
    synchronize)
      # Un commit poussé par quelqu'un: ce qui avait été validé ne vaut plus.
      label_remove "$pr" "$READY"
      release_lock_if_held
      status pending "Nouveau commit: reposer le label « ready » pour publier"
      exit 0
      ;;
    labeled | unlabeled)
      # Le verrou est posé et retiré par la CI elle-même: on l'ignore ici.
      [ "$LABEL" = "$READY" ] || exit 0
      if [ "$ACTION" = "unlabeled" ]; then
        release_lock_if_held
        status pending "En attente du label « ready »"
        exit 0
      fi
      ;;
  esac
fi

# --- La PR est-elle prête? -------------------------------------------------

if [ "$(field .state)" != "OPEN" ] || [ "$(field .baseRefName)" != "main" ]; then
  echo "PR fermée ou qui ne vise pas main: rien à faire."
  exit 0
fi
if ! has_label "$READY"; then
  status pending "En attente du label « ready »"
  exit 0
fi
if [ "$(field .isDraft)" = "true" ]; then
  status pending "Brouillon: sortir du brouillon pour publier"
  exit 0
fi
if [ "$(field .isCrossRepository)" = "true" ]; then
  status failure "Branche d'un fork: publication impossible depuis la CI"
  exit 0
fi

# Les vérifications de la PR doivent être vertes sur ce commit avant de
# prendre le verrou: un échec ne retarde ainsi aucune autre PR.
# Exception: un commit de version laissé par une préparation échouée n'a pas
# de vérifications de PR (la CI ne se relance pas pour ses propres commits).
# La préparation le reteste de toute façon avant de donner le feu vert.
author="$(gh api "repos/$repo/commits/$sha" --jq ".author.login // empty")"
if [ "$author" = "github-actions[bot]" ]; then
  CHECKS=""
fi

runs="$(gh api "repos/$repo/commits/$sha/check-runs?per_page=100" --jq '.check_runs | map({id, name, conclusion})')"
IFS='|' read -ra checks <<< "$CHECKS"
waiting=""
[ -n "$CHECKS" ] || checks=()
for check in "${checks[@]}"; do
  # La plus récente exécution de cette vérification (une relance remplace la précédente).
  conclusion="$(jq -r --arg n "$check" 'map(select(.name == $n)) | max_by(.id) | .conclusion // "absent"' <<< "$runs")"
  case "$conclusion" in
    success) ;;
    failure | cancelled | timed_out | action_required)
      label_remove "$pr" "$READY"
      status failure "« $check » a échoué: corriger, puis reposer « ready »"
      exit 0
      ;;
    *) waiting="$check" ;;
  esac
done
if [ -n "$waiting" ]; then
  # « Vérifier la PR » relancera la porte quand ses vérifications auront fini.
  status pending "En attente des vérifications (« $waiting »)"
  exit 0
fi

# --- Le verrou -------------------------------------------------------------

holder="$(gh pr list --repo "$repo" --state open --label "$LOCK" --json number --jq "map(.number | select(. != $pr)) | .[0] // empty")"
if [ -n "$holder" ]; then
  status pending "En file d'attente derrière la PR #$holder"
  exit 0
fi

label_add "$pr" "$LOCK"
status pending "Préparation de la version en cours"
out go true
out branche "$(field .headRefName)"
echo "Verrou pris par la PR #$pr."
