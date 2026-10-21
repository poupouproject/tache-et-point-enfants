-- AlterTable
-- Ajout simple plutôt que la reconstruction de table proposée par Prisma:
-- SQLite accepte une colonne NOT NULL avec une valeur par défaut, et les
-- lignes existantes la reçoivent sans être copiées.
ALTER TABLE "Child" ADD COLUMN "canEditProfile" BOOLEAN NOT NULL DEFAULT true;
