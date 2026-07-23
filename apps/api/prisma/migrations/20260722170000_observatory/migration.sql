ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'adari_interaction';
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'observatory_state';
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'food_inventory';

ALTER TABLE "UserCreature"
  ADD COLUMN "bond" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "satiety" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "lastSatietyCalculationAt" TIMESTAMP(3),
  ADD COLUMN "activeBehaviorState" TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN "lastInteractionAt" TIMESTAMP(3);

UPDATE "UserCreature"
SET "lastSatietyCalculationAt" = COALESCE("lastVigorCalculationAt", "updatedAt")
WHERE "lastSatietyCalculationAt" IS NULL;

CREATE TABLE "FoodDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "satietyValue" INTEGER NOT NULL,
  "bondValue" INTEGER NOT NULL,
  "preferredByAdariKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "assetKey" TEXT NOT NULL,
  "contentVersion" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FoodDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserFoodInventory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "foodDefinitionId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserFoodInventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserFoodInventory_quantity_check" CHECK ("quantity" >= 0)
);

CREATE TABLE "AdariInteraction" (
  "id" TEXT NOT NULL,
  "clientGeneratedId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userAdariId" TEXT NOT NULL,
  "interactionType" TEXT NOT NULL,
  "foodDefinitionId" TEXT,
  "bondGranted" INTEGER NOT NULL DEFAULT 0,
  "satietyGranted" INTEGER NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "localDate" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "calculationVersion" INTEGER NOT NULL DEFAULT 1,
  "serverFlagged" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdariInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ObservatoryState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "selectedControlMode" TEXT NOT NULL DEFAULT 'tap',
  "lastSafePlayerPosition" JSONB,
  "unlockedObjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "seenDialogueKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
  "particlesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "movementSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "qualityMode" TEXT NOT NULL DEFAULT 'automatic',
  "musicEnabled" BOOLEAN NOT NULL DEFAULT false,
  "effectsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "hapticsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ObservatoryState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FoodDefinition_key_key" ON "FoodDefinition"("key");
CREATE UNIQUE INDEX "UserFoodInventory_userId_foodDefinitionId_key"
  ON "UserFoodInventory"("userId", "foodDefinitionId");
CREATE INDEX "UserFoodInventory_userId_idx" ON "UserFoodInventory"("userId");
CREATE UNIQUE INDEX "AdariInteraction_userId_clientGeneratedId_key"
  ON "AdariInteraction"("userId", "clientGeneratedId");
CREATE INDEX "AdariInteraction_userAdariId_localDate_interactionType_idx"
  ON "AdariInteraction"("userAdariId", "localDate", "interactionType");
CREATE INDEX "AdariInteraction_userId_occurredAt_idx"
  ON "AdariInteraction"("userId", "occurredAt");
CREATE UNIQUE INDEX "ObservatoryState_userId_key" ON "ObservatoryState"("userId");

ALTER TABLE "UserFoodInventory" ADD CONSTRAINT "UserFoodInventory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFoodInventory" ADD CONSTRAINT "UserFoodInventory_foodDefinitionId_fkey"
  FOREIGN KEY ("foodDefinitionId") REFERENCES "FoodDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdariInteraction" ADD CONSTRAINT "AdariInteraction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdariInteraction" ADD CONSTRAINT "AdariInteraction_userAdariId_fkey"
  FOREIGN KEY ("userAdariId") REFERENCES "UserCreature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdariInteraction" ADD CONSTRAINT "AdariInteraction_foodDefinitionId_fkey"
  FOREIGN KEY ("foodDefinitionId") REFERENCES "FoodDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ObservatoryState" ADD CONSTRAINT "ObservatoryState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

