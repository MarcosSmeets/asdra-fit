import { BATTLE_CALCULATION_VERSION } from '@ad-sidera/config';
import {
  INTENSITY_XP,
  PVE_DAILY_WIN_LIMIT,
  PVE_DAILY_XP_CAP_MULTIPLIER,
  PVE_XP_PER_WIN_MULTIPLIER,
  STANDARD_ACTIVITY,
} from './constants';
import { durationFactor } from './rewards';

/**
 * XP-base de referência de UMA atividade padrão. Ancora a XP (limitada) do PvE.
 *
 * Hoje a XP de atividade não escala com o nível (depende de intensidade/duração),
 * então isto é praticamente constante; o parâmetro `level` é mantido na assinatura
 * para estabilidade e afinação futura. Atividade padrão = intensidade moderada em
 * uma duração nominal.
 */
export function getStandardActivityXp(level: number): number {
  void level;
  return Math.round(
    INTENSITY_XP[STANDARD_ACTIVITY.intensity] * durationFactor(STANDARD_ACTIVITY.durationMinutes),
  );
}

/** Teto diário de XP concedido pelas vitórias PvE (≤30% do XP de uma atividade padrão). */
export function pveDailyXpCap(level: number): number {
  return Math.round(getStandardActivityXp(level) * PVE_DAILY_XP_CAP_MULTIPLIER);
}

/** XP nominal por vitória PvE (~6% do XP de uma atividade padrão). */
export function pveXpPerWin(level: number): number {
  return Math.max(1, Math.round(getStandardActivityXp(level) * PVE_XP_PER_WIN_MULTIPLIER));
}

export interface PveWinReward {
  /** Posição desta vitória no dia (1-based). */
  winNumber: number;
  /** XP concedido por ESTA vitória (0 se além do limite diário). */
  xp: number;
  /** true se está dentro do limite recompensado. */
  rewarded: boolean;
  reason?: 'daily_limit_reached';
  /** Teto diário de XP (para exibição). */
  dailyXpCap: number;
  /** Vitórias recompensadas restantes no dia APÓS esta (para exibição). */
  remainingRewardedWins: number;
  battleCalculationVersion: number;
}

/**
 * Calcula a XP de uma vitória PvE dado quantas vitórias RECOMPENSADAS já ocorreram
 * hoje (`priorRewardedWins`, 0-based). Garante que as 5 vitórias do dia somem no
 * máximo o teto (a última corrige o arredondamento acumulado). A 6ª vitória em
 * diante concede 0 XP (mas a batalha ainda pode ocorrer por diversão).
 *
 * Chefes usam esta MESMA função (contam como uma das vitórias, com o mesmo XP).
 */
export function calculatePveWinReward(level: number, priorRewardedWins: number): PveWinReward {
  const cap = pveDailyXpCap(level);
  const winNumber = priorRewardedWins + 1;

  if (priorRewardedWins >= PVE_DAILY_WIN_LIMIT) {
    return {
      winNumber,
      xp: 0,
      rewarded: false,
      reason: 'daily_limit_reached',
      dailyXpCap: cap,
      remainingRewardedWins: 0,
      battleCalculationVersion: BATTLE_CALCULATION_VERSION,
    };
  }

  const perWin = pveXpPerWin(level);
  const grantedSoFar = perWin * priorRewardedWins;
  // A última vitória do dia fecha exatamente o teto (absorve o arredondamento).
  const xp =
    winNumber === PVE_DAILY_WIN_LIMIT ? Math.max(0, cap - grantedSoFar) : perWin;

  return {
    winNumber,
    xp,
    rewarded: true,
    dailyXpCap: cap,
    remainingRewardedWins: PVE_DAILY_WIN_LIMIT - winNumber,
    battleCalculationVersion: BATTLE_CALCULATION_VERSION,
  };
}

/** Ainda há vitória recompensada disponível hoje? */
export function hasRewardedWinAvailable(rewardedWinsToday: number): boolean {
  return rewardedWinsToday < PVE_DAILY_WIN_LIMIT;
}
