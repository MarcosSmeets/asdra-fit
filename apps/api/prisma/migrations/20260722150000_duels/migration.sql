-- Duelo amistoso entre membros de liga (server-authoritative, determinístico).
CREATE TABLE "DuelSession" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "leagueId" TEXT,
    "dayKey" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "winner" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL,
    "challengerSnapshot" JSONB NOT NULL,
    "opponentSnapshot" JSONB NOT NULL,
    "vigorSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DuelSession_challengerId_opponentId_dayKey_idx" ON "DuelSession"("challengerId", "opponentId", "dayKey");
CREATE INDEX "DuelSession_opponentId_idx" ON "DuelSession"("opponentId");
CREATE INDEX "DuelSession_challengerId_idx" ON "DuelSession"("challengerId");

ALTER TABLE "DuelSession" ADD CONSTRAINT "DuelSession_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuelSession" ADD CONSTRAINT "DuelSession_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
