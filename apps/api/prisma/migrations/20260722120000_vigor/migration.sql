-- Vigor (recurso de descanso): metadados de recuperação por tempo na criatura do usuário.
-- `energy` já existente passa a representar o Vigor ATUAL (currentVigor).
ALTER TABLE "UserCreature" ADD COLUMN     "maxVigor" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "UserCreature" ADD COLUMN     "vigorRecoveryRate" DOUBLE PRECISION NOT NULL DEFAULT 5;
ALTER TABLE "UserCreature" ADD COLUMN     "lastVigorCalculationAt" TIMESTAMP(3);

-- Baseline de recuperação para criaturas já existentes.
UPDATE "UserCreature" SET "lastVigorCalculationAt" = "updatedAt" WHERE "lastVigorCalculationAt" IS NULL;
