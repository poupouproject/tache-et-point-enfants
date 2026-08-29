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

function client(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Le client est construit à la première requête, pas à l'import.
 *
 * C'est ce qui permet à `next build` de charger les modules sans DATABASE_URL:
 * au build, on ne fait qu'importer, jamais interroger. La configuration de
 * connexion reste ainsi une affaire d'exécution, pas de compilation.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property);
    // Les méthodes comme $transaction doivent garder le client comme `this`.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
