import type { BossConfig } from './types';

/**
 * Mecânicas de chefe — puras e OBSERVÁVEIS (sem aleatoriedade injusta):
 * - Fases por limiar de vida (ex.: 70% / 35%).
 * - Golpe TELEGRAFADO: a cada N turnos o chefe carrega (avisa) e desfere no turno seguinte.
 * - Vulnerabilidade/resistência temporária enquanto carrega (janela de contra-jogo).
 * - Bônus de dano por fase alcançada.
 */

/** Fase atual do chefe = nº de limiares já ultrapassados (desc.). */
export function bossPhase(config: BossConfig, healthFraction: number): number {
  let phase = 0;
  for (const threshold of config.phaseThresholds) {
    if (healthFraction <= threshold) {
      phase += 1;
    }
  }
  return phase;
}

/** O chefe deve TELEGRAFAR (começar a carregar) neste turno? Padrão fixo e observável. */
export function bossShouldTelegraph(config: BossConfig, turnsSinceTelegraph: number): boolean {
  if (config.telegraphEveryTurns <= 0) {
    return false;
  }
  return turnsSinceTelegraph >= config.telegraphEveryTurns;
}

/** Multiplicador de dano que o chefe RECEBE (vulnerável enquanto carrega). */
export function bossIncomingMultiplier(config: BossConfig, charging: boolean): number {
  return charging ? config.chargingVulnerability : 1;
}

/** Bônus multiplicativo de dano que o chefe DESFERE conforme a fase alcançada. */
export function bossOutgoingMultiplier(config: BossConfig, phase: number): number {
  return 1 + config.phaseDamageBonus * phase;
}
