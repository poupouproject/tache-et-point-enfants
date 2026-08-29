# syntax=docker/dockerfile:1
ARG BUILD_FROM=node:24-bookworm-slim

# --- Étape de build ---------------------------------------------------------
FROM ${BUILD_FROM} AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `prisma generate` ne se connecte pas à la base: il ne lui faut que le schéma,
# donc aucune DATABASE_URL n'est nécessaire ici.
RUN npx prisma generate && npm run build

# --- Image finale -----------------------------------------------------------
FROM ${BUILD_FROM} AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# On n'installe que les dépendances de production. `--ignore-scripts` évite que
# le postinstall (prisma generate) tourne ici sans le schéma: le client déjà
# généré est copié depuis l'étape de build juste après.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY next.config.ts prisma7.config.ts ./
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000
CMD ["/run.sh"]
