-- CreateTable
CREATE TABLE "UserAdariAttributeState" (
    "id" TEXT NOT NULL,
    "userAdariId" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "trainingTotal" INTEGER NOT NULL DEFAULT 0,
    "trainingProgress" INTEGER NOT NULL DEFAULT 0,
    "progressRequired" INTEGER NOT NULL DEFAULT 100,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAdariAttributeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAdariLevelUpReward" (
    "id" TEXT NOT NULL,
    "userAdariId" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "attributeGains" JSONB NOT NULL,
    "operationId" TEXT NOT NULL,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAdariLevelUpReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAdariAttributeState_userAdariId_idx" ON "UserAdariAttributeState"("userAdariId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdariAttributeState_userAdariId_attribute_key" ON "UserAdariAttributeState"("userAdariId", "attribute");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdariLevelUpReward_operationId_key" ON "UserAdariLevelUpReward"("operationId");

-- CreateIndex
CREATE INDEX "UserAdariLevelUpReward_userAdariId_toLevel_idx" ON "UserAdariLevelUpReward"("userAdariId", "toLevel");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdariLevelUpReward_userAdariId_toLevel_key" ON "UserAdariLevelUpReward"("userAdariId", "toLevel");

-- AddForeignKey
ALTER TABLE "UserAdariAttributeState" ADD CONSTRAINT "UserAdariAttributeState_userAdariId_fkey" FOREIGN KEY ("userAdariId") REFERENCES "UserCreature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdariLevelUpReward" ADD CONSTRAINT "UserAdariLevelUpReward_userAdariId_fkey" FOREIGN KEY ("userAdariId") REFERENCES "UserCreature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
