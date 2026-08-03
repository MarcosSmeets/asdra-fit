-- Build 5: evolução em 4 estágios (0=BASE, 1=EV1, 2=EV2, 3=PERFEITA).
-- O inteiro legado 1 passa a significar EV 1 — sem migração de dados.

-- AlterEnum
ALTER TYPE "SyncEntityType" ADD VALUE 'adari_evolution';

-- AlterTable
ALTER TABLE "UserCreature" ADD COLUMN "evolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserAdariEvolutionHistory" (
    "id" TEXT NOT NULL,
    "userAdariId" TEXT NOT NULL,
    "fromStage" INTEGER NOT NULL,
    "toStage" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL,
    "triggeringReason" TEXT NOT NULL,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAdariEvolutionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAdariEvolutionHistory_userAdariId_idx" ON "UserAdariEvolutionHistory"("userAdariId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdariEvolutionHistory_userAdariId_fromStage_toStage_key" ON "UserAdariEvolutionHistory"("userAdariId", "fromStage", "toStage");

-- AddForeignKey
ALTER TABLE "UserAdariEvolutionHistory" ADD CONSTRAINT "UserAdariEvolutionHistory_userAdariId_fkey" FOREIGN KEY ("userAdariId") REFERENCES "UserCreature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
