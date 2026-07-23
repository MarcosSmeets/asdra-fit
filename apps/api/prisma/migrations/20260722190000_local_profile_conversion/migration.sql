CREATE TABLE "LocalProfileConversion" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "localProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creatingAccount',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalProfileConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocalProfileConversion_operationId_key" ON "LocalProfileConversion"("operationId");
CREATE UNIQUE INDEX "LocalProfileConversion_userId_key" ON "LocalProfileConversion"("userId");
CREATE INDEX "LocalProfileConversion_localProfileId_idx" ON "LocalProfileConversion"("localProfileId");

ALTER TABLE "LocalProfileConversion" ADD CONSTRAINT "LocalProfileConversion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
