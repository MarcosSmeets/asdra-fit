-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'deleted');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ios', 'android', 'web');

-- CreateEnum
CREATE TYPE "Archetype" AS ENUM ('forca', 'resistencia', 'equilibrio');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('musculacao', 'corrida', 'caminhada', 'ciclismo', 'natacao', 'esporte_coletivo', 'funcional', 'mobilidade', 'outro');

-- CreateEnum
CREATE TYPE "Intensity" AS ENUM ('leve', 'moderada', 'intensa');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('pessimo', 'ruim', 'neutro', 'bom', 'otimo');

-- CreateEnum
CREATE TYPE "LeagueRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('active', 'finalized');

-- CreateEnum
CREATE TYPE "SyncEntityType" AS ENUM ('activity', 'weekly_goal', 'user_creature', 'weekly_progress', 'profile');

-- CreateEnum
CREATE TYPE "SyncOperationType" AS ENUM ('upsert', 'delete');

-- CreateEnum
CREATE TYPE "SyncResult" AS ENUM ('processed', 'duplicate', 'conflict', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "avatarType" TEXT NOT NULL DEFAULT 'star',
    "shareCreatureLevel" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "pushToken" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatureDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archetype" "Archetype" NOT NULL,
    "affinity" TEXT NOT NULL,
    "baseStats" JSONB NOT NULL,
    "abilities" JSONB NOT NULL,
    "evolutionDefinitionKey" TEXT,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatureDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCreature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatureKey" TEXT NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "evolutionStage" INTEGER NOT NULL DEFAULT 0,
    "strength" INTEGER NOT NULL DEFAULT 0,
    "endurance" INTEGER NOT NULL DEFAULT 0,
    "agility" INTEGER NOT NULL DEFAULT 0,
    "discipline" INTEGER NOT NULL DEFAULT 0,
    "recovery" INTEGER NOT NULL DEFAULT 0,
    "spirit" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "energy" INTEGER NOT NULL DEFAULT 0,
    "defeatedMilestones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCreature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "preferredDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "activityTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "allowExtraActivities" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "clientGeneratedId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "perceivedIntensity" "Intensity" NOT NULL,
    "notes" TEXT,
    "location" TEXT,
    "moodBefore" "Mood",
    "moodAfter" "Mood",
    "hasLocalPhoto" BOOLEAN NOT NULL DEFAULT false,
    "remotePhotoKey" TEXT,
    "isScored" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReward" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "xpGranted" INTEGER NOT NULL,
    "energyGranted" INTEGER NOT NULL,
    "attributeChanges" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationVersion" INTEGER NOT NULL,

    CONSTRAINT "ActivityReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "validActivityCount" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 20,
    "status" "LeagueStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueInvite" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LeagueRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueSeason" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'active',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueRankingEntry" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalPercentage" DOUBLE PRECISION NOT NULL,
    "streakBonus" DOUBLE PRECISION NOT NULL,
    "completionBonus" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueRankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "activityReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyGoalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "evolutionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leagueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "reminderTime" TEXT NOT NULL DEFAULT '18:00',
    "preferredDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "operationId" TEXT NOT NULL,
    "entityType" "SyncEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "operationType" "SyncOperationType" NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" "SyncResult" NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_installationId_key" ON "Device"("userId", "installationId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatureDefinition_key_key" ON "CreatureDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserCreature_userId_key" ON "UserCreature"("userId");

-- CreateIndex
CREATE INDEX "WeeklyGoal_userId_active_idx" ON "WeeklyGoal"("userId", "active");

-- CreateIndex
CREATE INDEX "Activity_userId_occurredAt_idx" ON "Activity"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_userId_deletedAt_idx" ON "Activity"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_userId_clientGeneratedId_key" ON "Activity"("userId", "clientGeneratedId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityReward_activityId_key" ON "ActivityReward"("activityId");

-- CreateIndex
CREATE INDEX "WeeklyProgress_userId_idx" ON "WeeklyProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyProgress_userId_weekKey_key" ON "WeeklyProgress"("userId", "weekKey");

-- CreateIndex
CREATE INDEX "League_ownerId_idx" ON "League"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueInvite_code_key" ON "LeagueInvite"("code");

-- CreateIndex
CREATE INDEX "LeagueInvite_leagueId_idx" ON "LeagueInvite"("leagueId");

-- CreateIndex
CREATE INDEX "LeagueMember_userId_idx" ON "LeagueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "LeagueSeason_leagueId_status_idx" ON "LeagueSeason"("leagueId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSeason_leagueId_weekKey_key" ON "LeagueSeason"("leagueId", "weekKey");

-- CreateIndex
CREATE INDEX "LeagueRankingEntry_seasonId_position_idx" ON "LeagueRankingEntry"("seasonId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueRankingEntry_seasonId_userId_key" ON "LeagueRankingEntry"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncOperation_operationId_key" ON "SyncOperation"("operationId");

-- CreateIndex
CREATE INDEX "SyncOperation_userId_idx" ON "SyncOperation"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCreature" ADD CONSTRAINT "UserCreature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyGoal" ADD CONSTRAINT "WeeklyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReward" ADD CONSTRAINT "ActivityReward_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProgress" ADD CONSTRAINT "WeeklyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueInvite" ADD CONSTRAINT "LeagueInvite_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSeason" ADD CONSTRAINT "LeagueSeason_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRankingEntry" ADD CONSTRAINT "LeagueRankingEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeagueSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRankingEntry" ADD CONSTRAINT "LeagueRankingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
