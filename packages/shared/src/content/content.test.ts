import { simulateBattle } from '../battle/engine';
import { computeBattlePower } from '../battlePower';
import { DIFFICULTY_POWER_RANGE } from '../constants';
import { scaleAdversary } from '../enemyScaling';
import { unlockedAbilities } from './abilities';
import { creatureBattlePower, creatureToCombatant } from './combatant';
import { CREATURES, getCreatureByKey } from './creatures';
import { ADVERSARIES, getAdversariesByRegion, getAdversaryById } from './adversaries';
import { REGIONS } from './regions';

describe('content', () => {
  it('possui exatamente 3 criaturas iniciais originais e distintas', () => {
    expect(CREATURES).toHaveLength(3);
    const archetypes = CREATURES.map((c) => c.archetype);
    expect(new Set(archetypes)).toEqual(new Set(['forca', 'resistencia', 'equilibrio']));
    expect(new Set(CREATURES.map((c) => c.key)).size).toBe(3);
  });

  it('cada criatura tem uma evolução com requisitos além do nível', () => {
    for (const c of CREATURES) {
      expect(c.evolution.toKey).toBeTruthy();
      expect(c.evolution.requirements.minWeeksGoalMet).toBeGreaterThan(0);
      expect(c.evolution.requirements.minActivities).toBeGreaterThan(0);
    }
  });

  it('possui 3 regiões e 15 adversários (4 não-chefe + 1 chefe por região)', () => {
    expect(REGIONS).toHaveLength(3);
    expect(ADVERSARIES).toHaveLength(15);
    for (const region of REGIONS) {
      const list = getAdversariesByRegion(region.key);
      expect(list).toHaveLength(5);
      expect(list.filter((a) => a.isBoss)).toHaveLength(1);
      expect(list.filter((a) => !a.isBoss)).toHaveLength(4);
    }
  });

  it('cadeias de desbloqueio apontam para adversários existentes', () => {
    const ids = new Set(ADVERSARIES.map((a) => a.id));
    for (const adv of ADVERSARIES) {
      if (adv.unlockAfter) {
        expect(ids.has(adv.unlockAfter)).toBe(true);
      }
    }
  });

  it('curva de dificuldade: chefe é mais forte que os comuns da região', () => {
    for (const region of REGIONS) {
      const list = getAdversariesByRegion(region.key);
      const bossFind = list.find((a) => a.isBoss);
      expect(bossFind).toBeDefined();
      if (!bossFind) continue;
      const commons = list.filter((a) => !a.isBoss);
      for (const c of commons) {
        expect(bossFind.baseStats.maxHealth).toBeGreaterThan(c.baseStats.maxHealth);
      }
    }
  });

  it('metadados de dificuldade coerentes (níveis, faixa, perfis)', () => {
    for (const adv of ADVERSARIES) {
      expect(adv.minLevel).toBeLessThanOrEqual(adv.maxLevel);
      expect(adv.abilities.length).toBeGreaterThanOrEqual(1);
      if (adv.isBoss) {
        expect(adv.difficultyType).toBe('boss');
        expect(adv.boss).toBeDefined();
        expect(adv.behaviorProfile).toBe('bossPattern');
      }
    }
  });
});

describe('escalonamento de adversários', () => {
  const terravok = getCreatureByKey('terravok');

  function playerPowerAt(level: number): number {
    return creatureBattlePower(terravok!.baseStats, unlockedAbilities('terravok', level).length, 0);
  }

  it('a razão de battlePower fica dentro da faixa da dificuldade', () => {
    const playerLevel = 6;
    const power = playerPowerAt(playerLevel);
    for (const adv of ADVERSARIES) {
      const scaled = scaleAdversary(adv, power, playerLevel, 7);
      const [lo, hi] = DIFFICULTY_POWER_RANGE[adv.difficultyType];
      // Tolerância pequena para arredondamento de stats.
      expect(scaled.powerRatio).toBeGreaterThanOrEqual(lo - 0.08);
      expect(scaled.powerRatio).toBeLessThanOrEqual(hi + 0.08);
    }
  });

  it('nível efetivo é limitado a [minLevel, maxLevel] (não copia o jogador)', () => {
    const first = getAdversaryById('r1-1')!;
    const scaledLow = scaleAdversary(first, playerPowerAt(1), 1, 1);
    const scaledHigh = scaleAdversary(first, playerPowerAt(99), 99, 1);
    expect(scaledLow.effectiveLevel).toBeGreaterThanOrEqual(first.minLevel);
    expect(scaledHigh.effectiveLevel).toBeLessThanOrEqual(first.maxLevel);
  });

  it('battlePower cresce com atributos e habilidades', () => {
    const weak = computeBattlePower({ maxHealth: 100, attack: 10, defense: 5, speed: 5 }, 2, 0);
    const strong = computeBattlePower({ maxHealth: 100, attack: 10, defense: 5, speed: 5 }, 4, 1);
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('batalha determinística com conteúdo real', () => {
  it('a mesma seed produz o mesmo resultado (reprodutível)', () => {
    const terravok = getCreatureByKey('terravok')!;
    const abilities = unlockedAbilities('terravok', 3);
    const player = creatureToCombatant('p', terravok.name, terravok.baseStats, abilities);
    const power = creatureBattlePower(terravok.baseStats, abilities.length, 0);
    const enemy = scaleAdversary(getAdversaryById('r1-1')!, power, 3, 42).combatant;
    const basicId = abilities.find((a) => a.slot === 'basicAttack')!.id;

    const run = () =>
      simulateBattle({ player, enemy, seed: 99 }, () => ({ type: 'ability', abilityId: basicId }));
    const a = run();
    const b = run();
    expect(a.status).not.toBe('ongoing');
    expect(a.status).toBe(b.status);
    expect(a.round).toBe(b.round);
    expect(a.log.length).toBe(b.log.length);
  });
});
