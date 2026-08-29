/**
 * Amorçage de la base.
 *
 * Idempotent: on peut le relancer sans dupliquer. Il s'exécute aussi au
 * démarrage de l'add-on, ce qui garantit qu'il y a toujours des PIN utilisables
 * même sur une base vierge.
 *
 * PIN par défaut: 1234 (accès) et 9999 (parent) — à changer dans l'app.
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

async function main() {
  const accessPin = process.env.SEED_ACCESS_PIN || "1234";
  const parentPin = process.env.SEED_PARENT_PIN || "9999";

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

  if (!settings) {
    await prisma.appSettings.create({
      data: {
        id: 1,
        accessPinHash: bcrypt.hashSync(accessPin, 10),
        parentPinHash: bcrypt.hashSync(parentPin, 10),
        pointsPerDollar: 100,
      },
    });
    console.log(`Réglages créés (PIN accès ${accessPin}, PIN parent ${parentPin}).`);
  } else {
    console.log("Réglages déjà présents, inchangés.");
  }

  // Le reste n'est qu'un jeu de démonstration: on ne l'installe que sur une
  // base réellement vide, pour ne pas réintroduire des données supprimées.
  const childCount = await prisma.child.count();
  if (childCount > 0) {
    console.log("Des enfants existent déjà, aucun exemple ajouté.");
    return;
  }

  const alex = await prisma.child.create({
    data: { name: "Alex", avatar: "🦊", color: "blue", sortOrder: 0 },
  });
  const sam = await prisma.child.create({
    data: { name: "Sam", avatar: "🐢", color: "green", sortOrder: 1 },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Vider le lave-vaisselle",
        icon: "utensils",
        type: "FAMILY",
        pointsValue: 15,
        recurrence: "DAILY",
        sortOrder: 0,
      },
      {
        title: "Sortir les poubelles",
        icon: "trash",
        type: "FAMILY",
        pointsValue: 20,
        recurrence: "WEEKDAYS",
        weekdays: "1,4",
        sortOrder: 1,
      },
      {
        title: "Passer le balai",
        icon: "broom",
        type: "FAMILY",
        pointsValue: 25,
        recurrence: "WEEKLY",
        sortOrder: 2,
      },
      {
        title: "Faire son lit",
        icon: "bed",
        type: "INDIVIDUAL",
        pointsValue: 10,
        recurrence: "DAILY",
        assignedChildId: alex.id,
        sortOrder: 3,
      },
      {
        title: "Faire son lit",
        icon: "bed",
        type: "INDIVIDUAL",
        pointsValue: 10,
        recurrence: "DAILY",
        assignedChildId: sam.id,
        sortOrder: 4,
      },
      {
        title: "Ranger sa chambre",
        icon: "box",
        type: "INDIVIDUAL",
        pointsValue: 30,
        recurrence: "WEEKLY",
        assignedChildId: alex.id,
        sortOrder: 5,
      },
      {
        title: "Ranger sa chambre",
        icon: "box",
        type: "INDIVIDUAL",
        pointsValue: 30,
        recurrence: "WEEKLY",
        assignedChildId: sam.id,
        sortOrder: 6,
      },
    ],
  });

  await prisma.reward.createMany({
    data: [
      {
        name: "30 min de jeu vidéo",
        icon: "gamepad",
        costPoints: 50,
        sortOrder: 0,
      },
      { name: "Choisir le film", icon: "film", costPoints: 80, sortOrder: 1 },
      { name: "Collation spéciale", icon: "candy", costPoints: 40, sortOrder: 2 },
      {
        name: "Sortie au parc",
        icon: "trees",
        costPoints: 150,
        sortOrder: 3,
      },
    ],
  });

  console.log("Données d'exemple créées.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
