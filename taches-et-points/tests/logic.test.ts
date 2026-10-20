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
import { after, afterEach, before, beforeEach, describe, it } from "node:test";

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
  children: typeof import("../src/lib/children");
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
    children: await import("../src/lib/children"),
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

describe("changement de récurrence", () => {
  it("ne laisse pas repayer une tâche déjà faite aujourd'hui", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Quotidienne",
        type: "FAMILY",
        pointsValue: 20,
        recurrence: "DAILY",
      },
    });

    await m.tasks.completeTask(task.id, alex.id);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 20);

    // Le parent la passe en hebdomadaire: la forme de la clé d'occurrence
    // change, et sans remappage la complétion du jour deviendrait invisible.
    await m.tasks.updateTask(task.id, { recurrence: "WEEKLY" });

    const retry = await m.tasks.completeTask(task.id, alex.id);

    assert.equal(retry.ok, false, "la tâche reste faite pour cette occurrence");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 20);
  });

  it("fusionne les complétions qui retombent sur la même occurrence", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Quotidienne",
        type: "FAMILY",
        pointsValue: 5,
        recurrence: "DAILY",
      },
    });

    // Deux jours de la même semaine ISO.
    await m.tasks.completeTask(task.id, alex.id, new Date("2026-08-24T15:00:00Z"));
    await m.tasks.completeTask(task.id, alex.id, new Date("2026-08-25T15:00:00Z"));

    await m.tasks.updateTask(task.id, { recurrence: "WEEKLY" });

    const remaining = await m.prisma.taskCompletion.findMany({
      where: { taskId: task.id },
    });
    const weekKey = m.due.periodKeyFor("WEEKLY", remaining[0].completedAt);
    assert.equal(
      remaining.filter((c) => c.periodKey === weekKey).length,
      1,
      "une seule occurrence hebdomadaire",
    );

    // Le grand livre garde les deux gains: on ne réécrit pas l'histoire.
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 10);
  });

  it("garde les complétions fusionnées pour la série et l'annulation", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Quotidienne",
        type: "FAMILY",
        pointsValue: 5,
        recurrence: "DAILY",
      },
    });

    // Trois jours d'affilée qui finissent aujourd'hui, posés à la main pour
    // maîtriser completedAt (la base l'horodate sinon à l'instant présent).
    const now = new Date();
    for (const daysAgo of [2, 1, 0]) {
      const at = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      await m.prisma.taskCompletion.create({
        data: {
          taskId: task.id,
          childId: alex.id,
          periodKey: m.due.periodKeyFor("DAILY", at),
          pointsAwarded: 5,
          completedAt: at,
        },
      });
    }

    assert.equal(await m.tasks.streakOf(alex.id, now), 3);

    await m.tasks.updateTask(task.id, { recurrence: "ONE_TIME" });

    const remaining = await m.prisma.taskCompletion.findMany({
      where: { taskId: task.id },
      orderBy: { completedAt: "asc" },
    });
    assert.equal(remaining.length, 3, "aucune complétion n'est supprimée");
    assert.equal(
      remaining.filter((c) => c.periodKey === "once").length,
      1,
      "une seule tient l'occurrence",
    );
    assert.equal(await m.tasks.streakOf(alex.id, now), 3, "la série survit");

    // Une complétion archivée reste annulable par un parent.
    assert.equal(await m.tasks.revokeCompletion(remaining[0].id), true);
  });

  it("revient sans heurt à la récurrence d'origine", async () => {
    const { alex } = await makeKids();
    const task = await m.prisma.task.create({
      data: {
        title: "Quotidienne",
        type: "FAMILY",
        pointsValue: 5,
        recurrence: "DAILY",
      },
    });

    await m.tasks.completeTask(task.id, alex.id);
    await m.tasks.updateTask(task.id, { recurrence: "WEEKLY" });
    await m.tasks.updateTask(task.id, { recurrence: "DAILY" });

    const retry = await m.tasks.completeTask(task.id, alex.id);
    assert.equal(retry.ok, false, "toujours faite aujourd'hui");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 5);
  });
});

describe("tâches masquées", () => {
  it("garde au tableau le travail déjà fait aujourd'hui", async () => {
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
    await m.prisma.task.update({
      where: { id: task.id },
      data: { active: false },
    });

    const board = await m.tasks.buildBoard();
    const card = board.find((c) => c.id === alex.id);
    assert.ok(card);

    assert.equal(card.doneToday.length, 1, "la tâche faite reste affichée");
    assert.equal(card.doneToday[0].title, "Balayer");
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

describe("double clics d'un parent", () => {
  it("n'annule qu'une fois une confirmation", async () => {
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

    const results = await Promise.all([
      m.tasks.revokeCompletion(completion!.id),
      m.tasks.revokeCompletion(completion!.id),
    ]);

    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 0);
  });

  it("ne rembourse qu'une fois une récompense refusée", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 500,
      source: "MANUAL",
      description: "Départ",
    });
    const reward = await m.prisma.reward.create({
      data: { name: "Vélo", costPoints: 500 },
    });

    await m.rewards.requestReward(alex.id, reward.id);
    const redemption = await m.prisma.rewardRedemption.findFirst();

    const results = await Promise.all([
      m.rewards.resolveRedemption(redemption!.id, "REJECTED"),
      m.rewards.resolveRedemption(redemption!.id, "REJECTED"),
    ]);

    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 500);
  });

  it("ne rembourse qu'une fois une conversion refusée", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 300,
      source: "MANUAL",
      description: "Départ",
    });

    await m.rewards.requestConversion(alex.id, 300);
    const conversion = await m.prisma.moneyConversion.findFirst();

    await Promise.all([
      m.rewards.resolveConversion(conversion!.id, "REJECTED"),
      m.rewards.resolveConversion(conversion!.id, "REJECTED"),
    ]);

    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 300);
  });
});

describe("enfant désactivé", () => {
  it("ne gagne plus de points ni ne dépense", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id,
      type: "MANUAL_ADJUST",
      points: 100,
      source: "MANUAL",
      description: "Départ",
    });
    const task = await m.prisma.task.create({
      data: {
        title: "Balayer",
        type: "FAMILY",
        pointsValue: 25,
        recurrence: "DAILY",
      },
    });
    const reward = await m.prisma.reward.create({
      data: { name: "Jeu", costPoints: 50 },
    });

    await m.prisma.child.update({
      where: { id: alex.id },
      data: { active: false },
    });

    assert.equal((await m.tasks.completeTask(task.id, alex.id)).ok, false);
    assert.equal((await m.rewards.requestReward(alex.id, reward.id)).ok, false);
    assert.equal((await m.rewards.requestConversion(alex.id, 100)).ok, false);
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 100);
  });

  it("refuse proprement un identifiant inventé", async () => {
    const task = await m.prisma.task.create({
      data: {
        title: "Balayer",
        type: "FAMILY",
        pointsValue: 25,
        recurrence: "DAILY",
      },
    });

    const result = await m.tasks.completeTask(task.id, "inexistant");
    assert.equal(result.ok, false);
  });
});

describe("frein du NIP", () => {
  it("verrouille même quand les essais arrivent en parallèle", async () => {
    const throttle = await import("../src/lib/auth/throttle");
    const key = `test-${Date.now()}`;

    // Aucune comparaison n'a encore répondu: c'est la réservation seule qui
    // doit faire barrage, comme pour des requêtes lancées en rafale.
    const waits = Array.from({ length: 50 }, () => throttle.reserveAttempt(key));

    assert.equal(waits.filter((w) => w === 0).length, 6, "5 essais libres + 1");
    assert.ok(waits.slice(6).every((w) => w > 0));

    throttle.recordSuccess(key);
    assert.equal(throttle.reserveAttempt(key), 0, "un succès efface l'ardoise");
  });
});

describe("compteurs du tableau de bord", () => {
  it("compte les tâches individuelles qui restent à chaque enfant", async () => {
    const { alex, sam } = await makeKids();
    for (const title of ["Faire son lit", "Ranger sa chambre"]) {
      await m.prisma.task.create({
        data: { title, type: "INDIVIDUAL", pointsValue: 1, recurrence: "DAILY", assignedChildId: alex.id },
      });
    }
    const lit = await m.prisma.task.findFirstOrThrow({ where: { title: "Faire son lit" } });
    await m.tasks.completeTask(lit.id, alex.id);

    const board = await m.tasks.buildBoard();
    assert.equal(board.find((c) => c.id === alex.id)!.remaining, 1);
    assert.equal(board.find((c) => c.id === sam.id)!.remaining, 0);
  });

  it("compte une seule fois chaque tâche familiale encore libre", async () => {
    const { alex } = await makeKids();
    for (const title of ["Vider le lave-vaisselle", "Mettre la table"]) {
      await m.prisma.task.create({
        data: { title, type: "FAMILY", pointsValue: 2, recurrence: "DAILY" },
      });
    }

    let board = await m.tasks.buildBoard();
    assert.equal(m.tasks.familyRemaining(board), 2, "deux tâches, deux enfants: 2, pas 4");

    const table = await m.prisma.task.findFirstOrThrow({ where: { title: "Mettre la table" } });
    await m.tasks.completeTask(table.id, alex.id);

    board = await m.tasks.buildBoard();
    assert.equal(m.tasks.familyRemaining(board), 1);
    assert.equal(board.find((c) => c.id === alex.id)!.remaining, 0, "une tâche familiale n'est pas imposée");
  });
});

describe("profil d'un enfant", () => {
  it("change l'avatar et la couleur", async () => {
    const { alex } = await makeKids();

    const result = await m.children.updateChildProfile(alex.id, "🐲", "purple");

    assert.equal(result.ok, true);
    const updated = await m.prisma.child.findUniqueOrThrow({ where: { id: alex.id } });
    assert.equal(updated.avatar, "🐲");
    assert.equal(updated.color, "purple");
  });

  it("refuse un avatar ou une couleur hors des listes", async () => {
    const { alex } = await makeKids();

    assert.equal((await m.children.updateChildProfile(alex.id, "<b>moi</b>", "purple")).ok, false);
    assert.equal((await m.children.updateChildProfile(alex.id, "🐲", "fuchsia")).ok, false);

    const unchanged = await m.prisma.child.findUniqueOrThrow({ where: { id: alex.id } });
    assert.equal(unchanged.avatar, "🦊");
  });

  it("ne touche pas à un enfant masqué", async () => {
    const { alex } = await makeKids();
    await m.prisma.child.update({ where: { id: alex.id }, data: { active: false } });

    const result = await m.children.updateChildProfile(alex.id, "🐲", "purple");
    assert.equal(result.ok, false);
  });
});

describe("tâche « chaque enfant »", () => {
  async function eachTask(title = "Faire son lit") {
    return m.prisma.task.create({
      data: { title, type: "EACH", pointsValue: 2, recurrence: "DAILY" },
    });
  }

  it("se confirme une fois par enfant et par période", async () => {
    const { alex, sam } = await makeKids();
    const task = await eachTask();

    assert.equal((await m.tasks.completeTask(task.id, alex.id)).ok, true);
    assert.equal((await m.tasks.completeTask(task.id, sam.id)).ok, true, "l'autre enfant a la sienne");

    const again = await m.tasks.completeTask(task.id, alex.id);
    assert.equal(again.ok === false && again.reason, "ALREADY_TAKEN");

    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 2);
    assert.equal(await m.ledger.balanceOf(m.prisma, sam.id), 2);
  });

  it("revient le lendemain pour chacun", async () => {
    const { alex } = await makeKids();
    const task = await eachTask();
    const day1 = new Date("2026-08-24T15:00:00Z");
    const day2 = new Date("2026-08-25T15:00:00Z");

    assert.equal((await m.tasks.completeTask(task.id, alex.id, day1)).ok, true);
    assert.equal((await m.tasks.completeTask(task.id, alex.id, day2)).ok, true);
  });

  it("compte comme imposée et ne disparaît que chez celui qui l'a faite", async () => {
    const { alex, sam } = await makeKids();
    const task = await eachTask();
    await m.tasks.completeTask(task.id, alex.id);

    const board = await m.tasks.buildBoard();
    const alexCard = board.find((c) => c.id === alex.id)!;
    const samCard = board.find((c) => c.id === sam.id)!;

    assert.equal(alexCard.remaining, 0);
    assert.equal(samCard.remaining, 1);
    assert.equal(samCard.tasks.length, 1);
    assert.equal(m.tasks.familyRemaining(board), 0, "pas une tâche familiale");
  });

  it("garde le travail du jour quand une tâche individuelle devient « chaque enfant »", async () => {
    const { alex, sam } = await makeKids();
    const task = await m.prisma.task.create({
      data: { title: "Faire son lit", type: "INDIVIDUAL", pointsValue: 2, recurrence: "DAILY", assignedChildId: alex.id },
    });
    await m.tasks.completeTask(task.id, alex.id);

    await m.tasks.updateTask(task.id, { type: "EACH", assignedChildId: null, recurrence: "DAILY" });

    const retry = await m.tasks.completeTask(task.id, alex.id);
    assert.equal(retry.ok, false, "déjà faite aujourd'hui par Alex");
    assert.equal((await m.tasks.completeTask(task.id, sam.id)).ok, true, "Sam peut faire la sienne");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 2);
  });

  it("ne laisse pas repayer quand « chaque enfant » devient familiale", async () => {
    const { alex, sam } = await makeKids();
    const task = await eachTask("Ranger le salon");
    await m.tasks.completeTask(task.id, alex.id);
    await m.tasks.completeTask(task.id, sam.id);

    await m.tasks.updateTask(task.id, { type: "FAMILY", recurrence: "DAILY" });

    assert.equal((await m.tasks.completeTask(task.id, alex.id)).ok, false);
    const kept = await m.prisma.taskCompletion.count({ where: { taskId: task.id } });
    assert.equal(kept, 2, "les deux complétions restent, l'une archivée");
  });
});

describe("NIP imposés par Home Assistant", () => {
  async function pins() {
    return import("../src/lib/auth/pins");
  }
  async function storeHashes(access: string, parent: string) {
    const { hashPin } = await import("../src/lib/auth/pin-hash");
    await m.prisma.appSettings.update({
      where: { id: 1 },
      data: { accessPinHash: await hashPin(access), parentPinHash: await hashPin(parent) },
    });
  }

  afterEach(() => {
    delete process.env.ACCESS_PIN;
    delete process.env.PARENT_PIN;
  });

  it("sans option, le NIP de l'app fait foi", async () => {
    const { checkPin } = await pins();
    await storeHashes("1111", "2222");

    assert.equal(await checkPin("parent", "2222"), true);
    assert.equal(await checkPin("parent", "9999"), false);
  });

  it("remplace un NIP oublié, et le garde une fois l'option vidée", async () => {
    const { checkPin } = await pins();
    await storeHashes("1111", "2222"); // 2222: le NIP parent oublié

    process.env.PARENT_PIN = "4826";
    assert.equal(await checkPin("parent", "2222"), false, "l'ancien NIP ne passe plus");
    assert.equal(await checkPin("parent", "4826"), true);

    delete process.env.PARENT_PIN;
    assert.equal(await checkPin("parent", "4826"), true, "recopié dans l'app");
    assert.equal(await checkPin("parent", "2222"), false);
  });

  it("ignore un NIP parent identique au NIP d'entrée", async () => {
    const { managedPins } = await pins();
    process.env.ACCESS_PIN = "1234";
    process.env.PARENT_PIN = "1234";

    assert.deepEqual(managedPins(), { access: "1234", parent: null });
  });

  it("ignore un NIP parent imposé identique au NIP d'entrée de l'app", async () => {
    const { checkPin } = await pins();
    await storeHashes("1111", "2222");
    process.env.PARENT_PIN = "1111";

    assert.equal(await checkPin("parent", "1111"), false, "le NIP d'entrée n'ouvre pas l'espace parents");
    assert.equal(await checkPin("parent", "2222"), true, "le NIP parent de l'app reste en place");
  });

  it("ignore une option mal formée", async () => {
    const { managedPins } = await pins();
    process.env.ACCESS_PIN = "12";
    process.env.PARENT_PIN = "abcd";

    assert.deepEqual(managedPins(), { access: null, parent: null });
  });
});

describe("activité de l'espace parents", () => {
  it("regroupe les tâches faites par jour, du plus récent au plus ancien", async () => {
    const { alex, sam } = await makeKids();
    const task = await m.prisma.task.create({
      data: { title: "Lit", type: "EACH", pointsValue: 2, recurrence: "DAILY" },
    });
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // completedAt est posé par la base: la veille se crée à la main.
    await m.prisma.taskCompletion.create({
      data: { taskId: task.id, childId: alex.id, periodKey: m.due.occurrenceKey(task, alex.id, yesterday), pointsAwarded: 2, completedAt: yesterday },
    });
    await m.tasks.completeTask(task.id, alex.id, now);
    await m.tasks.completeTask(task.id, sam.id, now);

    const activity = await import("../src/lib/activity");
    const days = await activity.taskActivity(null, now);

    assert.deepEqual(days.map((d) => d.label), ["Aujourd'hui", "Hier"]);
    assert.equal(days[0].items.length, 2);
    assert.equal(days[0].total, 4);

    const alexOnly = await activity.taskActivity(alex.id, now);
    assert.deepEqual(alexOnly.map((d) => d.items.length), [1, 1], "filtre par enfant");
  });

  it("liste les récompenses et l'argent demandés, avec leur statut", async () => {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id, type: "MANUAL_ADJUST", points: 300, source: "MANUAL", description: "Départ",
    });
    const reward = await m.prisma.reward.create({ data: { name: "Film", costPoints: 50 } });
    await m.rewards.requestReward(alex.id, reward.id);
    await m.rewards.requestConversion(alex.id, 200);
    const redemption = await m.prisma.rewardRedemption.findFirstOrThrow();
    await m.rewards.resolveRedemption(redemption.id, "FULFILLED");

    const activity = await import("../src/lib/activity");
    const [today] = await activity.spendingActivity(alex.id);

    assert.equal(today.items.length, 2);
    assert.equal(today.total, 250);
    const film = today.items.find((i) => i.title === "Film");
    assert.equal(film?.kind !== "task" && film?.status, "FULFILLED");
  });
});

describe("Home Assistant", () => {
  async function ha() {
    return {
      states: await import("../src/lib/ha/states"),
      decision: await import("../src/lib/ha/decision"),
    };
  }
  async function fund(childId: string, points: number) {
    await m.ledger.recordTransaction(m.prisma, {
      childId, type: "MANUAL_ADJUST", points, source: "MANUAL", description: "Départ",
    });
  }

  afterEach(() => {
    delete process.env.HA_DECISION_TOKEN;
  });

  it("nomme les entités d'après le prénom, sans accents", async () => {
    const { states } = await ha();
    assert.equal(states.slugify("Éloi"), "eloi");
    assert.equal(states.slugify("Marie-Ève"), "marie_eve");
    assert.equal(states.slugify("🦊"), "enfant");
  });

  it("expose les pièces, les tâches à faire et les demandes en attente", async () => {
    const { states } = await ha();
    const { alex } = await makeKids();
    await fund(alex.id, 120);
    await m.prisma.task.create({ data: { title: "Lit", type: "EACH", pointsValue: 1, recurrence: "DAILY" } });
    await m.prisma.task.create({ data: { title: "Vaisselle", type: "FAMILY", pointsValue: 3, recurrence: "DAILY" } });
    const reward = await m.prisma.reward.create({ data: { name: "Film", costPoints: 20 } });
    await m.rewards.requestReward(alex.id, reward.id);

    const all = await states.buildStates();
    const byId = new Map(all.map((s) => [s.entityId, s]));

    assert.equal(byId.get("sensor.quetes_pieces_alex")?.state, 100);
    assert.equal(byId.get("sensor.quetes_pieces_alex_taches")?.state, 1);
    assert.deepEqual(byId.get("sensor.quetes_pieces_alex_taches")?.attributes.taches, ["Lit"]);
    assert.equal(byId.get("sensor.quetes_pieces_taches_familiales")?.state, 1);
    assert.equal(byId.get("sensor.quetes_pieces_demandes")?.state, 1);
  });

  it("refuse un jeton absent, faux ou trop court", async () => {
    const { decision } = await ha();
    assert.equal(decision.isAuthorized("Bearer x"), false, "rien de configuré");

    process.env.HA_DECISION_TOKEN = "a".repeat(64);
    assert.equal(decision.isAuthorized(null), false);
    assert.equal(decision.isAuthorized("Bearer " + "b".repeat(64)), false);
    assert.equal(decision.isAuthorized("Bearer " + "a".repeat(64)), true);

    process.env.HA_DECISION_TOKEN = "court";
    assert.equal(decision.decisionToken(), null, "un jeton de moins de 32 caractères est ignoré");
  });

  it("approuve une récompense, une seule fois", async () => {
    const { decision } = await ha();
    const { alex } = await makeKids();
    await fund(alex.id, 100);
    const reward = await m.prisma.reward.create({ data: { name: "Film", costPoints: 50 } });
    const request = await m.rewards.requestReward(alex.id, reward.id);
    assert.ok(request.ok);

    const first = await decision.applyDecision({ type: "recompense", id: request.id, decision: "approuver" });
    const second = await decision.applyDecision({ type: "recompense", id: request.id, decision: "refuser" });

    assert.deepEqual(first, { ok: true, applied: true });
    assert.deepEqual(second, { ok: true, applied: false }, "déjà réglée: le refus ne rembourse pas");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 50);
  });

  it("refuse une conversion en argent et rembourse", async () => {
    const { decision } = await ha();
    const { alex } = await makeKids();
    await fund(alex.id, 300);
    const request = await m.rewards.requestConversion(alex.id, 200);
    assert.ok(request.ok);

    const result = await decision.applyDecision({ type: "argent", id: request.id, decision: "refuser" });

    assert.deepEqual(result, { ok: true, applied: true });
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 300);
  });

  it("rejette une décision mal formée", async () => {
    const { decision } = await ha();
    for (const body of [null, {}, { type: "cadeau", id: "x", decision: "approuver" }, { type: "argent", id: "x", decision: "peut-etre" }]) {
      assert.equal((await decision.applyDecision(body)).ok, false);
    }
  });
});

describe("boutique fermée par un parent", () => {
  async function children() {
    return import("../src/lib/children");
  }
  async function setup() {
    const { alex } = await makeKids();
    await m.ledger.recordTransaction(m.prisma, {
      childId: alex.id, type: "MANUAL_ADJUST", points: 200, source: "MANUAL", description: "Départ",
    });
    const reward = await m.prisma.reward.create({ data: { name: "Film", costPoints: 20 } });
    return { alex, reward };
  }

  it("refuse récompenses et argent, avec la raison", async () => {
    const c = await children();
    const { alex, reward } = await setup();
    assert.equal(await c.lockSpending(alex.id, 60, "  Chambre pas rangée  "), true);

    const buy = await m.rewards.requestReward(alex.id, reward.id);
    const money = await m.rewards.requestConversion(alex.id, 100);

    assert.equal(buy.ok === false && buy.reason, "LOCKED");
    assert.equal(buy.ok === false && buy.reason === "LOCKED" && buy.lock.reason, "Chambre pas rangée");
    assert.equal(money.ok === false && money.reason, "LOCKED");
    assert.equal(await m.ledger.balanceOf(m.prisma, alex.id), 200, "rien n'est débité");
  });

  it("laisse gagner des pièces", async () => {
    const c = await children();
    const { alex } = await setup();
    await c.lockSpending(alex.id, 60, "");
    const task = await m.prisma.task.create({ data: { title: "Lit", type: "EACH", pointsValue: 2, recurrence: "DAILY" } });

    assert.equal((await m.tasks.completeTask(task.id, alex.id)).ok, true);
  });

  it("rouvre d'elle-même à l'échéance, ou quand un parent la rouvre", async () => {
    const c = await children();
    const { alex, reward } = await setup();
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await c.lockSpending(alex.id, 60, "Hier soir", past); // échue depuis une heure
    assert.equal((await m.rewards.requestReward(alex.id, reward.id)).ok, true);

    await c.lockSpending(alex.id, 60, "");
    await c.unlockSpending(alex.id);
    assert.equal((await m.rewards.requestReward(alex.id, reward.id)).ok, true);
  });

  it("s'affiche sur la carte de l'enfant", async () => {
    const c = await children();
    const { alex } = await setup();
    await c.lockSpending(alex.id, 30, "Écrans");

    const card = (await m.tasks.buildBoard()).find((child) => child.id === alex.id)!;
    assert.equal(card.spendLock?.reason, "Écrans");
    assert.match(card.spendLock?.until ?? "", /h/);
  });

  it("n'accepte que les durées proposées", async () => {
    const c = await children();
    const { alex } = await setup();
    assert.equal(await c.lockSpending(alex.id, 999_999, "trop"), false);
    assert.equal(await c.lockSpending(alex.id, -5, "négatif"), false);
  });
});
