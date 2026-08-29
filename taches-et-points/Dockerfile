# syntax=docker/dockerfile:1
ARG BUILD_FROM=node:24-bookworm-slim

# --- Étape de build ---------------------------------------------------------
FROM ${BUILD_FROM} AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# De quoi compiler better-sqlite3 si aucun binaire précompilé ne correspond à
# cette version de Node. Ces outils restent dans l'étape de build, jetée ensuite.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Le schéma Prisma doit être présent AVANT `npm ci`: le postinstall du projet
# lance `prisma generate`, qui échoue sans lui.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# --- Outils de migration ----------------------------------------------------
# Le CLI Prisma sert au démarrage (`migrate deploy`) mais n'est pas tracé par
# la sortie autonome de Next. On l'installe à part, dans une arborescence
# minimale, plutôt que de traîner tout node_modules dans l'image finale.
FROM ${BUILD_FROM} AS migrator

WORKDIR /migrator
# On lit les versions dans le package.json du projet, puis on repart d'un
# package.json vide: installer dans celui du projet tirerait aussi toutes les
# dépendances de l'application, ce qu'on cherche précisément à éviter ici.
# dotenv accompagne prisma parce que prisma7.config.ts l'importe.
COPY package.json ./versions.json
RUN PRISMA_VERSION="$(node -p "require('./versions.json').dependencies.prisma")" \
    && DOTENV_VERSION="$(node -p "require('./versions.json').dependencies.dotenv")" \
    && rm versions.json \
    && npm init -y > /dev/null \
    && npm install --omit=dev "prisma@$PRISMA_VERSION" "dotenv@$DOTENV_VERSION" \
    && npm cache clean --force

# --- Image finale -----------------------------------------------------------
FROM ${BUILD_FROM} AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# La sortie autonome embarque son propre serveur et les seuls modules utiles.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Nécessaires aux migrations au démarrage. La destination se termine par
# `node_modules` parce que c'est ce segment que Node cherche en remontant les
# dossiers pour résoudre les dépendances du CLI.
COPY --from=migrator /migrator/node_modules ./migrator-modules/node_modules
COPY --from=builder /app/prisma ./prisma
COPY prisma7.config.ts ./

COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000
CMD ["/run.sh"]
