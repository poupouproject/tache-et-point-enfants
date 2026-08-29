import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Depuis Prisma 7, la connexion passe obligatoirement par un driver adapter.
 * L'URL pointe vers un fichier: `file:./dev.db` en développement, et
 * `file:/data/app.db` dans l'add-on (dossier persistant, inclus dans les
 * sauvegardes Home Assistant).
 */
function createClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. Attendu par exemple: file:./dev.db",
    );
  }

  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// En dev, Next recharge les modules à chaque édition: sans ce cache global on
// ouvrirait une nouvelle connexion SQLite à chaque rechargement.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
