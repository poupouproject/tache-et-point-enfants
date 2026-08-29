-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '🙂',
    "color" TEXT NOT NULL DEFAULT 'red',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "accessPinHash" TEXT NOT NULL,
    "parentPinHash" TEXT NOT NULL,
    "pointsPerDollar" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'star',
    "type" TEXT NOT NULL,
    "pointsValue" INTEGER NOT NULL,
    "recurrence" TEXT NOT NULL,
    "weekdays" TEXT,
    "assignedChildId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_assignedChildId_fkey" FOREIGN KEY ("assignedChildId") REFERENCES "Child" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskCompletion_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'CHILD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'gift',
    "costPoints" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "rewardId" TEXT,
    "rewardName" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "RewardRedemption_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoneyConversion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "MoneyConversion_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Task_active_idx" ON "Task"("active");

-- CreateIndex
CREATE INDEX "TaskCompletion_childId_completedAt_idx" ON "TaskCompletion"("childId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCompletion_taskId_periodKey_key" ON "TaskCompletion"("taskId", "periodKey");

-- CreateIndex
CREATE INDEX "Transaction_childId_createdAt_idx" ON "Transaction"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "Reward_active_idx" ON "Reward"("active");

-- CreateIndex
CREATE INDEX "RewardRedemption_status_createdAt_idx" ON "RewardRedemption"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MoneyConversion_status_createdAt_idx" ON "MoneyConversion"("status", "createdAt");
