-- Sessão de batalha PvE (idempotente por clientGeneratedId; recompensa re-derivada no servidor).
CREATE TABLE "BattleSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientGeneratedId" TEXT NOT NULL,
    "battleType" TEXT NOT NULL DEFAULT 'pve',
    "adversaryId" TEXT,
    "dayKey" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "xpGranted" INTEGER NOT NULL DEFAULT 0,
    "vigorSpent" INTEGER NOT NULL DEFAULT 0,
    "seed" INTEGER,
    "turns" INTEGER,
    "serverFlagged" BOOLEAN NOT NULL DEFAULT false,
    "battleCalculationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleSession_pkey" PRIMARY KEY ("id")
);

-- Progresso diário de PvE materializado (limite de vitórias/XP por dia local).
CREATE TABLE "DailyBattleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "rewardedWins" INTEGER NOT NULL DEFAULT 0,
    "xpGranted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyBattleProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BattleSession_userId_dayKey_idx" ON "BattleSession"("userId", "dayKey");
CREATE UNIQUE INDEX "BattleSession_userId_clientGeneratedId_key" ON "BattleSession"("userId", "clientGeneratedId");

CREATE INDEX "DailyBattleProgress_userId_idx" ON "DailyBattleProgress"("userId");
CREATE UNIQUE INDEX "DailyBattleProgress_userId_dayKey_key" ON "DailyBattleProgress"("userId", "dayKey");

ALTER TABLE "BattleSession" ADD CONSTRAINT "BattleSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyBattleProgress" ADD CONSTRAINT "DailyBattleProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
