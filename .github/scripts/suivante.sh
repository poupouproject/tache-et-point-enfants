#!/usr/bin/env bash
# Relance « Prêt à publier » pour la plus ancienne pull request en file:
# ouverte, avec « ready », sans le verrou, hors brouillon. Appelé quand le
# verrou se libère (publication terminée, échec, fermeture).
set -euo pipefail

next="$(gh pr list --repo "$GITHUB_REPOSITORY" --state open --base main --label "${READY:-ready}" \
  --json number,isDraft,labels \
  --jq "map(select(.isDraft | not) | select(.labels | map(.name) | index(\"${LOCK:-publication-en-cours}\") | not)) | sort_by(.number) | .[0].number // empty")"

if [ -n "$next" ]; then
  echo "PR suivante en file: #$next"
  gh workflow run pret-a-publier.yml --repo "$GITHUB_REPOSITORY" -f pr="$next"
else
  echo "Aucune PR en file."
fi
