#!/usr/bin/env bash
# Labels d'une pull request par l'API REST (issues). `gh pr edit` passe par
# GraphQL et échouait sans bruit avec le jeton de la CI: une étiquette
# « ready » restait en place après un nouveau commit.
#
# Une vraie erreur fait échouer l'appelant; seul « déjà absent » est toléré.

label_add() { # pr label
  gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$1/labels" -f "labels[]=$2" > /dev/null
}

label_remove() { # pr label
  local out
  if ! out="$(gh api -X DELETE "repos/$GITHUB_REPOSITORY/issues/$1/labels/$2" 2>&1)"; then
    grep -q "Label does not exist" <<< "$out" || { echo "$out" >&2; return 1; }
  fi
}

label_has() { # pr label
  gh api "repos/$GITHUB_REPOSITORY/issues/$1/labels" --jq '.[].name' | grep -qx "$2"
}
