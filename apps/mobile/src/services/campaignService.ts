import { PVE_DAILY_WIN_LIMIT, pveDailyXpCap } from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import { campaignRepository } from '../db/repositories/campaignRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { dailyBattleProgressRepository } from '../db/repositories/dailyBattleProgressRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { getCampaignState, type RegionState } from '../domain/campaign';
import { dayKey, nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import {
  finishPveBattle,
  getPveBattlePreview,
  type FinishPveBattleInput,
  type PveBattleOutcome,
  type PveBattlePreview,
} from './pveBattleService';

export async function getCampaign(): Promise<RegionState[]> {
  const db = await getDatabase();
  const defeated = await campaignRepository.defeatedIds(db);
  return getCampaignState(defeated);
}

export interface DailyBattleStatus {
  rewardedWinsToday: number;
  winLimit: number;
  dailyXpCap: number;
}

/** Status diário de PvE (vitórias recompensadas hoje e teto), no fuso do usuário. */
export async function getDailyBattleStatus(): Promise<DailyBattleStatus> {
  const db = await getDatabase();
  const profile = await profileRepository.get(db);
  const tz = profile?.timezone ?? 'UTC';
  const key = dayKey(nowIso(), tz);
  const rewardedWinsToday = await dailyBattleProgressRepository.rewardedWins(db, key);
  const creature = await creatureRepository.get(db);
  return {
    rewardedWinsToday,
    winLimit: PVE_DAILY_WIN_LIMIT,
    dailyXpCap: pveDailyXpCap(creature?.level ?? 1),
  };
}

export async function getDefeatedIds(): Promise<string[]> {
  const db = await getDatabase();
  return campaignRepository.defeatedIds(db);
}

export type VictoryResult = PveBattleOutcome;

/** Prévia pré-batalha (custo de Vigor, vitórias do dia, recompensa potencial). */
export function getBattlePreview(adversaryId: string): Promise<PveBattlePreview | null> {
  return getPveBattlePreview(adversaryId);
}

/**
 * Conclui uma batalha PvE com o resultado informado. Aplica custo de Vigor, XP
 * limitada do dia (5 vitórias/≤30%) e desbloqueio de campanha — idempotente por
 * `clientGeneratedId` (gerado se não informado).
 */
export function recordBattle(
  input: Omit<FinishPveBattleInput, 'clientGeneratedId'> & { clientGeneratedId?: string },
): Promise<PveBattleOutcome | null> {
  return finishPveBattle({
    ...input,
    clientGeneratedId: input.clientGeneratedId ?? uuidv4(),
  });
}

/** Compat.: registra uma VITÓRIA PvE (usado pela tela de batalha atual). */
export function recordVictory(
  adversaryId: string,
  options: { clientGeneratedId?: string; seed?: number | null; turns?: number | null } = {},
): Promise<VictoryResult | null> {
  return recordBattle({ adversaryId, result: 'victory', ...options });
}
