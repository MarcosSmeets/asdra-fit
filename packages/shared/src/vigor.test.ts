import { VIGOR_CALCULATION_VERSION } from '@ad-sidera/config';
import { BATTLE_VIGOR_COST, VIGOR } from './constants';
import {
  addVigor,
  canAffordVigor,
  computeVigorRecoveryRate,
  hoursUntilFullVigor,
  initialVigorState,
  recoverVigor,
  spendVigor,
  vigorCostForBattle,
  vigorCostForResult,
  type VigorState,
} from './vigor';

const T0 = '2026-07-22T00:00:00.000Z';
const hoursLater = (base: string, hours: number): string =>
  new Date(Date.parse(base) + hours * 3_600_000).toISOString();

const state = (over: Partial<VigorState> = {}): VigorState => ({
  currentVigor: 50,
  maxVigor: VIGOR.MAX,
  vigorRecoveryRate: VIGOR.BASE_RECOVERY_RATE,
  lastVigorCalculationAt: T0,
  ...over,
});

describe('vigor — taxa de recuperação', () => {
  it('base 5/h e satura em 7/h conforme o atributo Recuperação', () => {
    expect(computeVigorRecoveryRate(0)).toBe(VIGOR.BASE_RECOVERY_RATE);
    expect(computeVigorRecoveryRate(8)).toBeGreaterThanOrEqual(VIGOR.BASE_RECOVERY_RATE);
    expect(computeVigorRecoveryRate(40)).toBe(VIGOR.MAX_RECOVERY_RATE);
    expect(computeVigorRecoveryRate(1000)).toBe(VIGOR.MAX_RECOVERY_RATE);
  });

  it('nunca elimina o descanso (não passa do teto de 7/h)', () => {
    expect(computeVigorRecoveryRate(9999)).toBeLessThanOrEqual(VIGOR.MAX_RECOVERY_RATE);
  });
});

describe('vigor — recuperação por tempo', () => {
  it('recupera floor(horas × taxa) — 3h a 5/h = 15', () => {
    const r = recoverVigor(state({ currentVigor: 50 }), hoursLater(T0, 3));
    expect(r.recovered).toBe(15);
    expect(r.currentVigor).toBe(65);
    expect(r.vigorCalculationVersion).toBe(VIGOR_CALCULATION_VERSION);
  });

  it('funciona offline / app fechado (janela longa)', () => {
    const r = recoverVigor(state({ currentVigor: 0 }), hoursLater(T0, 100));
    expect(r.currentVigor).toBe(VIGOR.MAX); // satura no teto
  });

  it('respeita o teto máximo', () => {
    const r = recoverVigor(state({ currentVigor: 95 }), hoursLater(T0, 10));
    expect(r.currentVigor).toBe(VIGOR.MAX);
    expect(r.recovered).toBe(5);
  });

  it('quando já cheio, apenas sincroniza o relógio (recovered=0)', () => {
    const now = hoursLater(T0, 10);
    const r = recoverVigor(state({ currentVigor: VIGOR.MAX }), now);
    expect(r.recovered).toBe(0);
    expect(r.currentVigor).toBe(VIGOR.MAX);
    expect(r.lastVigorCalculationAt).toBe(now);
  });

  it('é à prova de drift: preserva a fração sub-ponto entre cálculos', () => {
    // 5/h → 1 ponto a cada 12 min. Duas janelas de 18 min recuperam 1 + 2 = 3 (não 1+1).
    const first = recoverVigor(state({ currentVigor: 0 }), hoursLater(T0, 0.3)); // 18 min → 1 ponto
    expect(first.recovered).toBe(1);
    const second = recoverVigor(
      state({ currentVigor: first.currentVigor, lastVigorCalculationAt: first.lastVigorCalculationAt }),
      hoursLater(T0, 0.6), // total 36 min desde T0 → deveria ter 3 pontos no total
    );
    expect(first.currentVigor + second.recovered).toBe(3);
  });

  it('não recupera nada se passou pouco tempo (mantém o relógio para acumular)', () => {
    const r = recoverVigor(state({ currentVigor: 10 }), hoursLater(T0, 0.1)); // 6 min < 12 min/ponto
    expect(r.recovered).toBe(0);
    expect(r.currentVigor).toBe(10);
    expect(r.lastVigorCalculationAt).toBe(T0);
  });

  it('relógio para trás não gera Vigor', () => {
    const r = recoverVigor(state({ currentVigor: 30 }), hoursLater(T0, -5));
    expect(r.recovered).toBe(0);
    expect(r.currentVigor).toBe(30);
  });

  it('taxa maior (Recuperação alta) recupera mais rápido', () => {
    const fast = recoverVigor(
      state({ currentVigor: 0, vigorRecoveryRate: VIGOR.MAX_RECOVERY_RATE }),
      hoursLater(T0, 2),
    );
    expect(fast.recovered).toBe(14); // 7/h × 2h
  });

  it('independe do fuso: usa instantes absolutos (ISO/UTC)', () => {
    const a = recoverVigor(state({ currentVigor: 0, lastVigorCalculationAt: '2026-07-22T00:00:00.000Z' }), '2026-07-22T04:00:00.000Z');
    const b = recoverVigor(state({ currentVigor: 0, lastVigorCalculationAt: '2026-07-21T21:00:00-03:00' }), '2026-07-22T01:00:00-03:00');
    expect(a.recovered).toBe(b.recovered);
  });
});

describe('vigor — custos de batalha', () => {
  it('custo por tipo de batalha', () => {
    expect(vigorCostForBattle('normalPve')).toBe(BATTLE_VIGOR_COST.normalPve);
    expect(vigorCostForBattle('elitePve')).toBe(BATTLE_VIGOR_COST.elitePve);
    expect(vigorCostForBattle('bossPve')).toBe(BATTLE_VIGOR_COST.bossPve);
    expect(vigorCostForBattle('friendlyDuel')).toBe(BATTLE_VIGOR_COST.friendlyDuel);
  });

  it('vitória consome 100% e derrota 50% do custo', () => {
    expect(vigorCostForResult(20, 'victory')).toBe(20);
    expect(vigorCostForResult(20, 'defeat')).toBe(10);
    expect(vigorCostForResult(15, 'defeat')).toBe(8); // round(7.5)
  });

  it('canAffordVigor e spendVigor', () => {
    expect(canAffordVigor(12, 12)).toBe(true);
    expect(canAffordVigor(11, 12)).toBe(false);
    expect(spendVigor(20, 12)).toBe(8);
    expect(spendVigor(5, 12)).toBe(0); // nunca abaixo de 0
  });
});

describe('vigor — bônus e utilidades', () => {
  it('addVigor satura no teto', () => {
    expect(addVigor(98, VIGOR.ACTIVITY_BONUS)).toBe(VIGOR.MAX);
    expect(addVigor(50, VIGOR.ACTIVITY_BONUS)).toBe(55);
  });

  it('estado inicial começa cheio', () => {
    const s = initialVigorState(10, T0);
    expect(s.currentVigor).toBe(VIGOR.MAX);
    expect(s.maxVigor).toBe(VIGOR.MAX);
    expect(s.lastVigorCalculationAt).toBe(T0);
  });

  it('hoursUntilFullVigor estima o tempo restante', () => {
    expect(hoursUntilFullVigor(state({ currentVigor: VIGOR.MAX }))).toBe(0);
    expect(hoursUntilFullVigor(state({ currentVigor: 90, vigorRecoveryRate: 5 }))).toBe(2);
  });
});
