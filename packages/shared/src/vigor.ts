import { VIGOR_CALCULATION_VERSION } from '@ad-sidera/config';
import { BATTLE_VIGOR, BATTLE_VIGOR_COST, VIGOR, type BattleVigorKind } from './constants';

/**
 * Vigor — recurso de descanso do Adari (fonte única de regras; puro e testável).
 *
 * O Vigor se recupera com o TEMPO (mesmo offline / app fechado): ao abrir o app,
 * recalcula-se a partir de `lastVigorCalculationAt`. Nunca é obtido por anúncios,
 * pagamento ou consumíveis. É consumido para ENTRAR em batalha (vitória = custo
 * cheio; derrota = metade). A Vida (dentro da batalha) é outra coisa e não persiste.
 */
export interface VigorState {
  /** Vigor atual [0, maxVigor]. Internamente é o campo `energy` da criatura. */
  currentVigor: number;
  maxVigor: number;
  /** Pontos recuperados por hora (derivado do atributo Recuperação). */
  vigorRecoveryRate: number;
  /** Instante ISO do último cálculo de recuperação. */
  lastVigorCalculationAt: string;
}

export interface VigorRecoveryResult {
  currentVigor: number;
  lastVigorCalculationAt: string;
  /** Pontos efetivamente recuperados neste cálculo. */
  recovered: number;
  vigorCalculationVersion: number;
}

const MS_PER_HOUR = 3_600_000;

/**
 * Taxa de recuperação (pontos/hora) derivada do atributo Recuperação.
 * Base 5/h, sobe `RECOVERY_ATTR_SLOPE` por ponto, saturando em 7/h.
 */
export function computeVigorRecoveryRate(recoveryAttribute: number): number {
  const raw = VIGOR.BASE_RECOVERY_RATE + Math.max(0, recoveryAttribute) * VIGOR.RECOVERY_ATTR_SLOPE;
  const clamped = Math.min(VIGOR.MAX_RECOVERY_RATE, Math.max(VIGOR.BASE_RECOVERY_RATE, raw));
  // Uma casa decimal para estabilidade entre cliente e servidor.
  return Math.round(clamped * 10) / 10;
}

/** Estado inicial de Vigor de um Adari recém-criado (cheio, relógio em `nowIso`). */
export function initialVigorState(recoveryAttribute: number, nowIso: string): VigorState {
  return {
    currentVigor: VIGOR.MAX,
    maxVigor: VIGOR.MAX,
    vigorRecoveryRate: computeVigorRecoveryRate(recoveryAttribute),
    lastVigorCalculationAt: nowIso,
  };
}

/**
 * Recupera Vigor pelo tempo decorrido — À PROVA DE DRIFT.
 *
 * Recupera `floor(elapsedHours × rate)` pontos. Ao NÃO atingir o teto, o relógio
 * avança apenas pelo tempo que produziu pontos INTEIROS (preservando a fração para
 * o próximo cálculo). Ao atingir o teto, o relógio salta para `now` (sem "banco"
 * de excesso). Relógio para trás (now < last) é tratado como nenhuma recuperação.
 */
export function recoverVigor(state: VigorState, nowIso: string): VigorRecoveryResult {
  const now = Date.parse(nowIso);
  const last = Date.parse(state.lastVigorCalculationAt);
  const rate = state.vigorRecoveryRate > 0 ? state.vigorRecoveryRate : VIGOR.BASE_RECOVERY_RATE;
  const max = state.maxVigor > 0 ? state.maxVigor : VIGOR.MAX;
  const current = Math.max(0, Math.min(max, state.currentVigor));

  const base = {
    currentVigor: current,
    lastVigorCalculationAt: state.lastVigorCalculationAt,
    recovered: 0,
    vigorCalculationVersion: VIGOR_CALCULATION_VERSION,
  };

  if (!Number.isFinite(now) || !Number.isFinite(last) || now <= last) {
    return base;
  }
  if (current >= max) {
    // Já cheio: apenas sincroniza o relógio (não há déficit a recuperar).
    return { ...base, lastVigorCalculationAt: nowIso };
  }

  const elapsedHours = (now - last) / MS_PER_HOUR;
  const rawPoints = Math.floor(elapsedHours * rate);
  if (rawPoints <= 0) {
    // Ainda não completou 1 ponto — preserva `lastCalc` para acumular a fração.
    return base;
  }

  const deficit = max - current;
  if (rawPoints >= deficit) {
    return {
      ...base,
      currentVigor: max,
      recovered: deficit,
      lastVigorCalculationAt: nowIso,
    };
  }

  // Não atingiu o teto: avança o relógio só pelo tempo dos pontos inteiros.
  const consumedMs = Math.round((rawPoints / rate) * MS_PER_HOUR);
  return {
    ...base,
    currentVigor: current + rawPoints,
    recovered: rawPoints,
    lastVigorCalculationAt: new Date(last + consumedMs).toISOString(),
  };
}

/** Custo base de Vigor para entrar em uma batalha do tipo informado. */
export function vigorCostForBattle(kind: BattleVigorKind): number {
  return BATTLE_VIGOR_COST[kind];
}

/** Custo efetivamente consumido conforme o resultado (vitória = 100%, derrota = 50%). */
export function vigorCostForResult(baseCost: number, result: 'victory' | 'defeat'): number {
  const multiplier =
    result === 'victory' ? BATTLE_VIGOR.VICTORY_COST_MULTIPLIER : BATTLE_VIGOR.DEFEAT_COST_MULTIPLIER;
  return Math.round(baseCost * multiplier);
}

/** Há Vigor suficiente para pagar `cost`? */
export function canAffordVigor(currentVigor: number, cost: number): boolean {
  return currentVigor >= cost;
}

/** Consome Vigor (nunca abaixo de 0). */
export function spendVigor(currentVigor: number, amount: number): number {
  return Math.max(0, currentVigor - Math.max(0, amount));
}

/** Adiciona Vigor (bônus de atividade), saturando no teto. */
export function addVigor(currentVigor: number, amount: number, maxVigor: number = VIGOR.MAX): number {
  return Math.max(0, Math.min(maxVigor, currentVigor + Math.max(0, amount)));
}

/** Horas restantes (aprox.) para atingir o Vigor cheio, dado o estado atual. */
export function hoursUntilFullVigor(state: VigorState): number {
  const max = state.maxVigor > 0 ? state.maxVigor : VIGOR.MAX;
  const rate = state.vigorRecoveryRate > 0 ? state.vigorRecoveryRate : VIGOR.BASE_RECOVERY_RATE;
  const deficit = Math.max(0, max - state.currentVigor);
  return deficit === 0 ? 0 : deficit / rate;
}
