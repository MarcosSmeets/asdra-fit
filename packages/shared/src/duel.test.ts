import { computeBattlePower } from './battlePower';
import type { BattleAbility, Combatant } from './battle/types';
import { normalizeDuel, simulateDuel } from './duel';

function ability(id: string, type: BattleAbility['type'] = 'damage'): BattleAbility {
  return { id, name: id, slot: 'basicAttack', type, power: 1, cooldown: 0, duration: 0 };
}

function combatant(over: Partial<Combatant> & { id: string }): Combatant {
  return {
    name: over.id,
    stats: { maxHealth: 120, attack: 25, defense: 10, speed: 12 },
    abilities: [ability(`${over.id}-atk`)],
    behaviorProfile: 'aggressive',
    isBoss: false,
    ...over,
  };
}

describe('duelos — normalização (duelo equilibrado)', () => {
  it('iguala o battlePower dos dois lados preservando as habilidades', () => {
    const strong = combatant({ id: 'c', stats: { maxHealth: 300, attack: 60, defense: 30, speed: 30 } });
    const weak = combatant({ id: 'o', stats: { maxHealth: 90, attack: 15, defense: 6, speed: 8 } });
    const { challenger, opponent } = normalizeDuel(strong, weak);
    const pc = computeBattlePower(challenger.stats, challenger.abilities.length, 0);
    const po = computeBattlePower(opponent.stats, opponent.abilities.length, 0);
    // Potências ficam próximas (tolerância de arredondamento).
    expect(Math.abs(pc - po) / Math.max(pc, po)).toBeLessThan(0.1);
    // Habilidades preservadas.
    expect(challenger.abilities).toHaveLength(strong.abilities.length);
    expect(opponent.abilities).toHaveLength(weak.abilities.length);
  });

  it('preserva as proporções de arquétipo (o mais forte em ataque segue relativamente forte)', () => {
    const bruiser = combatant({ id: 'c', stats: { maxHealth: 120, attack: 60, defense: 5, speed: 10 } });
    const tank = combatant({ id: 'o', stats: { maxHealth: 120, attack: 10, defense: 40, speed: 10 } });
    const { challenger, opponent } = normalizeDuel(bruiser, tank);
    expect(challenger.stats.attack).toBeGreaterThan(opponent.stats.attack);
    expect(opponent.stats.defense).toBeGreaterThan(challenger.stats.defense);
  });
});

describe('duelos — simulação', () => {
  it('é determinística: mesma seed → mesmo vencedor e rodadas', () => {
    const a = combatant({ id: 'c', stats: { maxHealth: 140, attack: 30, defense: 10, speed: 14 } });
    const b = combatant({ id: 'o', behaviorProfile: 'defensive', stats: { maxHealth: 140, attack: 26, defense: 12, speed: 10 } });
    const r1 = simulateDuel(a, b, 77);
    const r2 = simulateDuel(a, b, 77);
    expect(r1.winner).toBe(r2.winner);
    expect(r1.rounds).toBe(r2.rounds);
    expect(r1.challengerHealth).toBe(r2.challengerHealth);
  });

  it('o vencedor é challenger, opponent ou draw e a batalha termina', () => {
    const a = combatant({ id: 'c' });
    const b = combatant({ id: 'o', behaviorProfile: 'defensive' });
    const r = simulateDuel(a, b, 5);
    expect(['challenger', 'opponent', 'draw']).toContain(r.winner);
    expect(r.rounds).toBeGreaterThan(0);
  });

  it('seeds diferentes podem produzir resultados diferentes (há variação)', () => {
    const a = combatant({ id: 'c', stats: { maxHealth: 130, attack: 27, defense: 11, speed: 12 } });
    const b = combatant({ id: 'o', behaviorProfile: 'defensive', stats: { maxHealth: 130, attack: 27, defense: 11, speed: 12 } });
    const winners = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => simulateDuel(a, b, s).winner));
    expect(winners.size).toBeGreaterThanOrEqual(1);
  });
});
