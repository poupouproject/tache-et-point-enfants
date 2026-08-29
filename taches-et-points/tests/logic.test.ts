/**
 * Tests de la logique métier, exécutés contre une vraie base SQLite jetable.
 *
 * On teste l'arbitrage des tâches familiales, l'annulation, la récurrence et
 * l'intégrité du solde — c'est là que vivent les règles qui touchent, au bout
 * de la chaîne, à de l'argent réel.
 *
 * Lancer avec: npm test
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TEST_DB = path.join(process.cwd(), "tests", "test.db");

process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.APP_TIMEZONE = "America/Toronto";

// Les modules lisent DATABASE_URL à leur chargement: ils doivent donc être
// importés après, d'où les imports dynamiques dans before().
type Mods = {
  prisma: typeof import("../src/lib/prisma").prisma;
  ledger: typeof import("../src/lib/ledger");
  tasks: typeof import("../src/lib/tasks/service");
  due: typeof import("../src/lib/tasks/due");
  rewards: typeof import("../src/lib/rewards/service");
  time: typeof import("../src/lib/time");
};

let m: Mods;

before(async () => {
  rmSync(TEST_DB, { force: true });
  rmSync(`${TEST_DB}-journal`, { force: true });

  execFileSync(
    "npx",
    ["prisma", "migrate", "deploy", "--config", "prisma7.config.ts"],
    {
      env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
      stdio: "pipe",
      shell: true,
    },
  );

  m = {
    prisma: (await import("../src/lib/prisma")).prisma,
    ledger: await import("../src/lib/ledger"),
    tasks: await import("../src/lib/tasks/service"),
    due: await import("../src/lib/tasks/due"),
    rewards: await import("../src/lib/rewards/service"),
    time: await import("../src/lib/time"),
  };
});

after(async () => {
  await m.prisma.$disconnect();
  rmSync(TEST_DB, { force: true });
});

beforeEach(async () => {
  // Ordre imposé par les clés étrangères.
  await m.prisma.transaction.deleteMany();
  await m.prisma.taskCompletion.deleteMany();
  await m.prisma.rewardRedemption.deleteMany();
  await m.prisma.moneyConversion.deleteMany();
  await m.prisma.task.deleteMany();
  await m.prisma.reward.deleteMany();
  await m.prisma.child.deleteMany();
  await m.prisma.appSettings.deleteMany();

  await m.prisma.appSettings.create({
    data: {
      id: 1,
      accessPinHash: "x",
      parentPinHash: "y",
      pointsPerDollar: 100,
    },
  });
});

async function makeKids() {
  const alex = await m.prisma.child.create({
    data: { name: "Alex", avatar: "🦊", color: "blue" },
  });
  const sam = await m.prisma.child.create({
    data: { name: "Sam", avatar: "🐢", color: "green" },
  });
  return { alex, sam };
}

describe("clés de période", () => {
  it("change de clé d'un jour à l'autre pour une tâche quotidienne", () => {
    const monday = new Date("2026-08-24T15:00:00Z");
    const tuesday = new Date("2026-08-25T15:00:00Z");

    assert.notEqual(
      m.due.periodKeyFor("DAILY", monday),
      m.due.periodKeyFor("DAILY", tuesday),
    );
  });

  it("garde la même clé toute la semaine pour une tâche hebdomadaire", () => {
    const monday = new Date("2026-08-24T15:00:00Z");
    const friday = new Date("2026-08-28T15:00:00Z");

    assert.equal(
      m.due.periodKeyFor("WEEKLY", monday),
      m.due.periodKeyFor("WEEKLY", friday),
    );
  });

  it("n'a qu'une seule clé à vie pour une tâche ponctuelle", () => {
    const now = new Date("2026-08-24T15:00:00Z");
    const muchLater = new Date("2027-02-02T15:00:00Z");

    assert.equal(
      m.due.periodKeyFor("ONE_TIME", now),
      m.due.periodKeyFor("ONE_TIME", muchLater),
    );
  });

  it("calcule le jour local, pas le jour UTC", () => {
    // 1h du matin UTC le 25 = encore 21h le 24 à Toronto.
    const lateEvening = new Date("2026-08-25T01:00:00Z");
    assert.equal(m.time.dateKeyOf(lateEvening), "2026-08-24");
  });
});

describe("tâches à faire aujourd'hui", () => {
  it("ne propose une tâche WEEKDAYS que les jours choisis", () => {
    // 2026-08-24 est un lundi (jour 1).
    const monday = new Date("2026-08-24T15:00:00Z");
    const tuesday = new Date("2026-08-25T15:00:00Z");

    const task = { recurrence: "WEEKDAYS", weekdays: "1,4" };

    assert.equal(m.due.isDueNow(task, monday), true);
    assert.equal(m.due.isDueNow(task, tuesday), false);
  });

  it("propose toujours une tâche quotidienne", () => {
    const task = { recurrence: "DAILY", weekdays: null };
    assert.equal(m.due.isDueNow(task, new Date()), true);
  });
});

describe("confirmation d'une tâche", () => {
  it("crédite les points immédiatement", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Vider le lave-vaisselle",
        type: "FAMILY",
        pointsValue: 15,
        recurrence: "DAILY",
      },
    });

    const result = await m.tasks.completeTask(task.id, alex.id);

    assert.equal(result.ok, true);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 15);
  });

  it("refuse le second enfant sur une tâche familiale déjà prise", async () => {
    const { alex, sam } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Sortir les poubelles",
        type: "FAMILY",
        pointsValue: 20,
        recurrence: "DAILY",
      },
    });

    const first = await m.tasks.completeTask(task.id, alex.id);
    const second = await m.tasks.completeTask(task.id, sam.id);

    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(second.ok === false && second.reason, "ALREADY_TAKEN");

    // Le perdant ne doit surtout pas avoir été crédité.
    assert.equal(await m.ledger.balanceOf(m.prisma, sam.id), 0);
  });

  it("arbitre correctement deux clics vraiment simultanés", async () => {
    const { alex, sam } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Course",
        type: "FAMILY",
        pointsValue: 10,
        recurrence: "DAILY",
      },
    });

    const results = await Promise.all([
      m.tasks.completeTask(task.id, alex.id),
      m.tasks.completeTask(task.id, sam.id),
    ]);

    const winners = results.filter((r) => r.ok);
    assert.equal(winners.length, 1, "exactement un gagnant");

    const total =
      (await m.ledger.balanceOf(m.prisma, alex.id)) +
      (await m.ledger.balanceOf(m.prisma, sam.id));
    assert.equal(total, 10, "les points ne sont crédités qu'une fois");
  });

  it("empêche un enfant de confirmer la tâche individuelle d'un autre", async () => {
    const { alex, sam } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Faire son lit",
        type: "INDIVIDUAL",
        pointsValue: 10,
        recurrence: "DAILY",
        assignedChildId: alex.id,
      },
    });

    const result = await m.tasks.completeTask(task.id, sam.id);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, "NOT_AVAILABLE");
    assert.equal(await m.ledger.balanceOf(m.prisma, sam.id), 0);
  });

  it("redevient disponible le lendemain", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Quotidienne",
        type: "FAMILY",
        pointsValue: 5,
        recurrence: "DAILY",
      },
    });

    const day1 = new Date("2026-08-24T15:00:00Z");
    const day2 = new Date("2026-08-25T15:00:00Z");

    const first = await m.tasks.completeTask(task.id, alex.id, day1);
    const again = await m.tasks.completeTask(task.id, alex.id, day1);
    const nextDay = await m.tasks.completeTask(task.id, alex.id, day2);

    assert.equal(first.ok, true);
    assert.equal(again.ok, false, "pas deux fois le même jour");
    assert.equal(nextDay.ok, true, "de nouveau disponible le lendemain");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 10);
  });
});

describe("annulation par un parent", () => {
  it("retire les points et rend la tâche à nouveau disponible", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Balayer",
        type: "FAMILY",
        pointsValue: 25,
        recurrence: "DAILY",
      },
    });

    await m.tasks.completeTask(task.id, alex.id);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 25);

    const completion = await m.prisma.taskCompletion.findFirst();
    assert.ok(completion);

    const revoked = await m.tasks.revokeCompletion(completion.id);
    assert.equal(revoked, true);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 0);

    // La tâche est de nouveau confirmable pour la même journée.
    const retry = await m.tasks.completeTask(task.id, alex.id);
    assert.equal(retry.ok, true);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 25);
  });

  it("garde la trace du gain ET de son annulation", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Balayer",
        type: "FAMILY",
        pointsValue: 25,
        recurrence: "DAILY",
      },
    });

    await m.tasks.completeTask(task.id, alex.id);
    const completion = await m.prisma.taskCompletion.findFirst();
    await m.tasks.revokeCompletion(completion!.id);

    const entries = await m.prisma.transaction.findMany({
      where: { childId: alex.id },
      orderBy: { createdAt: "asc" },
    });

    assert.equal(entries.length, 2, "le ledger est append-only");
    assert.equal(entries[0].points, 25);
    assert.equal(entries[1].points, -25);
  });
});

describe("boutique et argent", () => {
  it("refuse un achat au-dessus du solde", async () => {
    const { alex } = await makeKids();
    const reward = await m.prisma.reward.create({
      data: { name: "Jeu vidéo", costPoints: 50 },
    });

    const result = await m.rewards.requestReward(alex.id, reward.id);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, "INSUFFICIENT_FUNDS");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 0);
  });

  it("débite immédiatement à la demande", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 100,
      source: "MANUAL",
      description: "Départ",
    });

    const reward = await m.prisma.reward.create({
      data: { name: "Jeu vidéo", costPoints: 50 },
    });

    const result = await m.rewards.requestReward(alex.id, reward.id);

    assert.equal(result.ok, true);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 50);
  });

  it("rembourse quand un parent refuse", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 100,
      source: "MANUAL",
      description: "Départ",
    });

    const reward = await m.prisma.reward.create({
      data: { name: "Jeu vidéo", costPoints: 50 },
    });

    await m.rewards.requestReward(alex.id, reward.id);
    const redemption = await m.prisma.rewardRedemption.findFirst();

    await m.rewards.resolveRedemption(redemption!.id, "REJECTED");

    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 100);
  });

  it("ne rembourse pas quand la récompense est remise", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 100,
      source: "MANUAL",
      description: "Départ",
    });

    const reward = await m.prisma.reward.create({
      data: { name: "Jeu vidéo", costPoints: 50 },
    });

    await m.rewards.requestReward(alex.id, reward.id);
    const redemption = await m.prisma.rewardRedemption.findFirst();
    await m.rewards.resolveRedemption(redemption!.id, "FULFILLED");

    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 50);
  });

  it("convertit les points en argent au taux configuré", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 500,
      source: "MANUAL",
      description: "Départ",
    });

    const result = await m.rewards.requestConversion(alex.id, 300);
    assert.equal(result.ok, true);

    const conversion = await m.prisma.moneyConversion.findFirst();
    assert.equal(conversion!.amountCents, 300, "300 points = 3,00 $ à 100/$");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 200);
  });

  it("empêche de dépenser deux fois les mêmes points", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 50,
      source: "MANUAL",
      description: "Départ",
    });

    const reward = await m.prisma.reward.create({
      data: { name: "Jeu vidéo", costPoints: 50 },
    });

    const first = await m.rewards.requestReward(alex.id, reward.id);
    const second = await m.rewards.requestReward(alex.id, reward.id);

    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 0);
  });
});

describe("tableau de bord", () => {
  it("cache aux autres une tâche familiale déjà prise", async () => {
    const { alex, sam } = await makeKids();
    await m.prisma.task.create({
      data: {
        title: "Familiale",
        type: "FAMILY",
        pointsValue: 10,
        recurrence: "DAILY",
      },
    });

    let board = await m.tasks.buildBoard();
    assert.equal(board.find((c) => c.id === alex.id)!.tasks.length, 1);
    assert.equal(board.find((c) => c.id === sam.id)!.tasks.length, 1);

    const task = await m.prisma.task.findFirst();
    await m.tasks.completeTask(task!.id, alex.id);

    board = await m.tasks.buildBoard();
    assert.equal(board.find((c) => c.id === alex.id)!.tasks.length, 0);
    assert.equal(
      board.find((c) => c.id === sam.id)!.tasks.length,
      0,
      "elle disparaît aussi chez les autres",
    );
  });

  it("ne montre une tâche individuelle qu'à son propriétaire", async () => {
    const { alex, sam } = await makeKids();
    await m.prisma.task.create({
      data: {
        title: "Son lit",
        type: "INDIVIDUAL",
        pointsValue: 10,
        recurrence: "DAILY",
        assignedChildId: alex.id,
      },
    });

    const board = await m.tasks.buildBoard();

    assert.equal(board.find((c) => c.id === alex.id)!.tasks.length, 1);
    assert.equal(board.find((c) => c.id === sam.id)!.tasks.length, 0);
  });
});
