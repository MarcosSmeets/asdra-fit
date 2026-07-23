import {
  ABILITIES,
  ABILITY_SLOT_UNLOCK_LEVEL,
  BATTLE_VIGOR_COST,
  CREATURES,
  DURATION,
  MAX_EQUIPPED_ABILITIES,
  computeDayRewards,
  recoverVigor,
  resolveEquippedAbilities,
} from './index';
import { initBattle, resolveRound } from './battle/engine';
import type { Combatant, PlannedAction } from './battle/types';

describe('MVP rescue — caracterização das regras preservadas', () => {
  it('preserva os três Adaris e suas evoluções existentes', () => {
    expect(CREATURES.map((creature) => [creature.name, creature.evolution.toName])).toEqual([
      ['Brontu', 'Asterhorn'],
      ['Velune', 'Stridara'],
      ['Myrin', 'Solvyr'],
    ]);
  });

  it('mantém a economia diária 100%, 25% e 0% sem remover registros do diário', () => {
    const activities = [1, 2, 3].map((position) => ({
      id: `activity-${position}`,
      activityType: 'caminhada',
      perceivedIntensity: 'moderada',
      durationMinutes: 60,
      occurredAt: `2026-07-22T1${position}:00:00.000Z`,
      createdAt: `2026-07-22T1${position}:00:01.000Z`,
    }));
    const rewards = computeDayRewards(activities);
    expect(rewards).toHaveLength(3);
    expect(rewards.map((reward) => reward.dailyRewardMultiplier)).toEqual([1, 0.25, 0]);
    expect(rewards.map((reward) => reward.countsTowardGoal)).toEqual([true, false, false]);
  });

  it('mantém mínimo de 10 minutos e teto de cálculo de 120 minutos', () => {
    expect(DURATION).toMatchObject({ MIN_MINUTES: 10, CAP_MINUTES: 120 });
    const rewards = computeDayRewards([
      {
        id: 'short',
        activityType: 'corrida',
        perceivedIntensity: 'moderada',
        durationMinutes: 9,
        occurredAt: '2026-07-22T10:00:00.000Z',
        createdAt: '2026-07-22T10:00:01.000Z',
      },
      {
        id: 'long',
        activityType: 'corrida',
        perceivedIntensity: 'moderada',
        durationMinutes: 240,
        occurredAt: '2026-07-22T11:00:00.000Z',
        createdAt: '2026-07-22T11:00:01.000Z',
      },
    ]);
    expect(rewards[0]?.finalXp).toBe(0);
    expect(rewards[1]?.baseXp).toBeLessThanOrEqual(27);
  });

  it('mantém Vigor offline e os custos centralizados', () => {
    const result = recoverVigor(
      { currentVigor: 40, maxVigor: 100, vigorRecoveryRate: 5, lastVigorCalculationAt: '2026-07-22T00:00:00.000Z' },
      '2026-07-22T04:00:00.000Z',
    );
    expect(result.currentVigor).toBe(60);
    expect(BATTLE_VIGOR_COST).toEqual({ normalPve: 12, elitePve: 15, bossPve: 20, friendlyDuel: 10 });
  });

  it('mantém desbloqueio 2/3/4 habilidades e máximo de quatro botões', () => {
    expect(ABILITY_SLOT_UNLOCK_LEVEL).toEqual({ basicAttack: 1, basicDefense: 1, special: 4, tactical: 7 });
    expect(MAX_EQUIPPED_ABILITIES).toBe(4);
    expect(resolveEquippedAbilities('terravok', 1, []).map((ability) => ability.slot)).toEqual([
      'basicAttack',
      'basicDefense',
    ]);
    expect(ABILITIES).toHaveLength(12);
  });
});

describe('MVP rescue — caracterização determinística do motor atual', () => {
  const basic = {
    id: 'basic', name: 'Ataque', slot: 'basicAttack' as const, type: 'damage' as const,
    power: 1, cooldown: 0, duration: 0,
  };
  const player: Combatant = {
    id: 'player', name: 'Adari', stats: { maxHealth: 120, attack: 28, defense: 12, speed: 12 },
    abilities: [basic], behaviorProfile: 'aggressive', isBoss: false,
  };
  const enemy: Combatant = {
    id: 'enemy', name: 'Guardião', stats: { maxHealth: 120, attack: 24, defense: 10, speed: 10 },
    abilities: [{ ...basic, id: 'enemy-basic' }], behaviorProfile: 'aggressive', isBoss: false,
  };
  const action: PlannedAction = { type: 'ability', abilityId: 'basic' };

  it('mesma seed e mesma decisão produzem exatamente o mesmo round', () => {
    const run = () => resolveRound(initBattle({ player, enemy, seed: 4421 }), action, { player, enemy });
    expect(run()).toEqual(run());
  });
});
