import { BATTLE_CALCULATION_VERSION } from '@ad-sidera/config';
import {
  applyXpGain,
  calculatePveWinReward,
  getAdversaryById,
  hasRewardedWinAvailable,
  PVE_DAILY_WIN_LIMIT,
  pveDailyXpCap,
  spendVigor,
  vigorCostForBattle,
  vigorCostForResult,
  type AdversaryDefinition,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { BattleResult, BattleSessionRecord, CreatureState } from '../db/models';
import { battleSessionRepository } from '../db/repositories/battleSessionRepository';
import { campaignRepository } from '../db/repositories/campaignRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { dailyBattleProgressRepository } from '../db/repositories/dailyBattleProgressRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { vigorKindForAdversary } from '../domain/battle';
import type { SqlDatabase } from '../db/types';
import { dayKey, nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { enqueueOperation } from './outbox';
import { battleSessionSyncPayload, creatureSyncPayload } from './syncPayloads';
import { recalculateVigor } from './vigorService';

/** Tipo de custo de Vigor conforme a dificuldade do adversário. */
export const battleKindForAdversary = vigorKindForAdversary;

async function timezoneOf(db: SqlDatabase): Promise<string> {
  const profile = await profileRepository.get(db);
  return profile?.timezone ?? 'UTC';
}

export interface PveBattlePreview {
  adversary: AdversaryDefinition;
  vigorCost: number;
  currentVigor: number;
  canAfford: boolean;
  rewardedWinsToday: number;
  remainingRewardedWins: number;
  /** XP que a PRÓXIMA vitória concederia (0 se o limite diário foi atingido). */
  xpIfWin: number;
  dailyXpCap: number;
  reachedDailyLimit: boolean;
  alreadyDefeated: boolean;
}

/** Prévia pré-batalha: custo de Vigor, vitórias do dia e recompensa potencial. */
export async function getPveBattlePreview(adversaryId: string): Promise<PveBattlePreview | null> {
  const db = await getDatabase();
  const adversary = getAdversaryById(adversaryId);
  let creature = await creatureRepository.get(db);
  if (!adversary || !creature) {
    return null;
  }
  creature = await recalculateVigor(db, creature);

  const tz = await timezoneOf(db);
  const key = dayKey(nowIso(), tz);
  const rewardedWinsToday = await dailyBattleProgressRepository.rewardedWins(db, key);
  const vigorCost = vigorCostForBattle(battleKindForAdversary(adversary));
  const nextWin = calculatePveWinReward(creature.level, rewardedWinsToday);
  const alreadyDefeated = await campaignRepository.isDefeated(db, adversaryId);

  return {
    adversary,
    vigorCost,
    currentVigor: creature.attributes.energy,
    canAfford: creature.attributes.energy >= vigorCost,
    rewardedWinsToday,
    remainingRewardedWins: Math.max(0, PVE_DAILY_WIN_LIMIT - rewardedWinsToday),
    xpIfWin: nextWin.xp,
    dailyXpCap: pveDailyXpCap(creature.level),
    reachedDailyLimit: !hasRewardedWinAvailable(rewardedWinsToday),
    alreadyDefeated,
  };
}

export interface FinishPveBattleInput {
  adversaryId: string;
  /** Identificador idempotente gerado no início da batalha. */
  clientGeneratedId: string;
  result: BattleResult;
  seed?: number | null;
  turns?: number | null;
}

export interface PveBattleOutcome {
  creature: CreatureState;
  result: BattleResult;
  xpGranted: number;
  leveledUp: boolean;
  vigorSpent: number;
  /** Contou como vitória recompensada (dentro do limite diário). */
  rewardedWin: boolean;
  dailyRewardedWins: number;
  remainingRewardedWins: number;
  dailyXpCap: number;
  /** Primeira derrota deste adversário: desbloqueio de campanha/região. */
  milestoneUnlocked: boolean;
  reachedDailyLimit: boolean;
  /** Já processada antes (idempotência): nenhum efeito reaplicado. */
  duplicate: boolean;
}

/**
 * Conclui uma batalha PvE (VITÓRIA ou DERROTA), de forma idempotente por
 * `clientGeneratedId`. Aplica o custo de Vigor (vitória 100%, derrota 50%), a XP
 * limitada do dia (5 vitórias, ≤30% do XP-base) e o desbloqueio de campanha na 1ª
 * vitória. Derrotas não consomem vitória. Enfileira sync (criatura + sessão).
 */
export async function finishPveBattle(
  input: FinishPveBattleInput,
): Promise<PveBattleOutcome | null> {
  const db = await getDatabase();
  const adversary = getAdversaryById(input.adversaryId);
  let creature = await creatureRepository.get(db);
  if (!adversary || !creature) {
    return null;
  }
  creature = await recalculateVigor(db, creature);

  // Idempotência: se já registramos esta sessão, não reaplica nada.
  const existing = await battleSessionRepository.getByClientId(db, input.clientGeneratedId);
  if (existing) {
    const rewardedWins = await dailyBattleProgressRepository.rewardedWins(db, existing.dayKey);
    return {
      creature,
      result: existing.result,
      xpGranted: existing.xpGranted,
      leveledUp: false,
      vigorSpent: existing.vigorSpent,
      rewardedWin: existing.rewarded,
      dailyRewardedWins: rewardedWins,
      remainingRewardedWins: Math.max(0, PVE_DAILY_WIN_LIMIT - rewardedWins),
      dailyXpCap: pveDailyXpCap(creature.level),
      milestoneUnlocked: false,
      reachedDailyLimit: !hasRewardedWinAvailable(rewardedWins),
      duplicate: true,
    };
  }

  const now = nowIso();
  const tz = await timezoneOf(db);
  const key = dayKey(now, tz);
  const level = creature.level;

  const priorWins = await dailyBattleProgressRepository.rewardedWins(db, key);
  const baseCost = vigorCostForBattle(battleKindForAdversary(adversary));
  const vigorSpent = vigorCostForResult(baseCost, input.result);

  let xpGranted = 0;
  let rewardedWin = false;
  let milestoneUnlocked = false;

  if (input.result === 'victory') {
    const winReward = calculatePveWinReward(level, priorWins);
    rewardedWin = winReward.rewarded;
    xpGranted = winReward.xp;
    // Desbloqueio de campanha na 1ª vitória — independe do limite diário de XP.
    const already = await campaignRepository.isDefeated(db, adversary.id);
    await campaignRepository.markDefeated(db, adversary.id, now);
    milestoneUnlocked = !already;
  }

  const xpResult = applyXpGain(creature.xp, xpGranted);
  const newVigor = spendVigor(creature.attributes.energy, vigorSpent);
  const milestones =
    input.result === 'victory' && !creature.defeatedMilestones.includes(adversary.id)
      ? [...creature.defeatedMilestones, adversary.id]
      : creature.defeatedMilestones;

  const updated: CreatureState = {
    ...creature,
    xp: xpResult.totalXp,
    level: xpResult.after.level,
    attributes: { ...creature.attributes, energy: newVigor },
    defeatedMilestones: milestones,
    updatedAt: now,
    syncStatus: 'pending',
  };
  await creatureRepository.update(db, updated);
  await enqueueOperation(db, {
    entityType: 'user_creature',
    entityId: updated.id,
    operationType: 'upsert',
    updatedAt: now,
    payload: creatureSyncPayload(updated),
  });

  const session: BattleSessionRecord = {
    id: uuidv4(),
    clientGeneratedId: input.clientGeneratedId,
    battleType: 'pve',
    adversaryId: adversary.id,
    dayKey: key,
    result: input.result,
    rewarded: rewardedWin,
    xpGranted,
    vigorSpent,
    seed: input.seed ?? null,
    turns: input.turns ?? null,
    battleCalculationVersion: BATTLE_CALCULATION_VERSION,
    createdAt: now,
    syncStatus: 'pending',
  };
  await battleSessionRepository.insert(db, session);
  await enqueueOperation(db, {
    entityType: 'battle_session',
    entityId: session.id,
    operationType: 'upsert',
    updatedAt: now,
    payload: battleSessionSyncPayload(session),
  });

  if (rewardedWin) {
    await dailyBattleProgressRepository.addRewardedWin(db, key, xpGranted, now);
  }

  const dailyRewardedWins = priorWins + (rewardedWin ? 1 : 0);
  return {
    creature: updated,
    result: input.result,
    xpGranted,
    leveledUp: xpResult.leveledUp,
    vigorSpent,
    rewardedWin,
    dailyRewardedWins,
    remainingRewardedWins: Math.max(0, PVE_DAILY_WIN_LIMIT - dailyRewardedWins),
    dailyXpCap: pveDailyXpCap(level),
    milestoneUnlocked,
    reachedDailyLimit: !hasRewardedWinAvailable(dailyRewardedWins),
    duplicate: false,
  };
}
