import { computeDamage } from './damage';
import { initBattle, resolveRound } from './engine';
import type { BattleAbility, Combatant } from './types';

const attack: BattleAbility = { id: 'atk', name: 'Golpe', slot: 'basicAttack', type: 'damage', power: 1, cooldown: 0, duration: 0 };
const defend: BattleAbility = { id: 'def', name: 'Guarda Estelar', slot: 'basicDefense', type: 'defense', power: 0.7, cooldown: 1, duration: 1 };
const player: Combatant = { id: 'p', name: 'Myrin', stats: { maxHealth: 100, attack: 10, defense: 0, speed: 20 }, abilities: [attack, defend], behaviorProfile: 'aggressive', isBoss: false };
const enemy: Combatant = { id: 'e', name: 'Eco Persistente', stats: { maxHealth: 200, attack: 20, defense: 0, speed: 1 }, abilities: [{ ...attack, id: 'enemy-atk' }], behaviorProfile: 'aggressive', isBoss: false };

describe('Guarda oficial de 70%', () => {
  it('transforma exatamente 20 de dano em 6 com variância neutra', () => {
    expect(computeDamage({ attackerAttack: 20, abilityPower: 1, defenderDefense: 0, variance: 1 })).toBe(20);
    expect(computeDamage({ attackerAttack: 20, abilityPower: 1, defenderDefense: 0, variance: 1, guarding: true })).toBe(6);
  });

  it('explica o bloqueio e consome a Guarda no primeiro ataque', () => {
    const first = resolveRound(initBattle({ player, enemy, seed: 22 }), { type: 'ability', abilityId: 'def' }, { player, enemy });
    const guardedHit = first.log.find((event) => event.side === 'enemy' && event.damage);
    expect(guardedHit?.blockedDamage).toBeGreaterThan(0);
    expect(guardedHit?.text).toContain('A Guarda bloqueou');
    expect(first.player.guarding).toBe(false);

    const second = resolveRound(first, { type: 'ability', abilityId: 'atk' }, { player, enemy });
    const nextHit = second.log.filter((event) => event.side === 'enemy' && event.damage).at(-1);
    expect(nextHit?.blockedDamage).toBe(0);
    expect(second.player.cooldowns.def).toBe(0);
  });
});

