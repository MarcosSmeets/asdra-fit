import { initBattle, resolveRound, simulateBattle } from './engine';
import type { BattleAbility, Combatant, PlannedAction } from './types';

function ability(over: Partial<BattleAbility> & Pick<BattleAbility, 'id' | 'type'>): BattleAbility {
  return {
    name: over.id,
    slot: 'special',
    power: 1,
    cooldown: 0,
    duration: 0,
    ...over,
  };
}

const BASIC = ability({ id: 'p-atk', type: 'damage', slot: 'basicAttack', power: 1, cooldown: 0 });
const DEFEND = ability({ id: 'p-def', type: 'defense', slot: 'basicDefense', power: 0.5, cooldown: 1, duration: 1 });

function player(abilities: BattleAbility[] = [BASIC, DEFEND]): Combatant {
  return {
    id: 'p',
    name: 'Adari',
    stats: { maxHealth: 120, attack: 30, defense: 10, speed: 12 },
    abilities,
    behaviorProfile: 'aggressive',
    isBoss: false,
  };
}

function enemy(over: Partial<Combatant> = {}): Combatant {
  return {
    id: 'e',
    name: 'Inimigo',
    stats: { maxHealth: 120, attack: 20, defense: 8, speed: 8 },
    abilities: [ability({ id: 'e-atk', type: 'damage', slot: 'basicAttack', power: 1, cooldown: 0 })],
    behaviorProfile: 'aggressive',
    isBoss: false,
    ...over,
  };
}

const attack = (id = 'p-atk'): PlannedAction => ({ type: 'ability', abilityId: id });

describe('engine v2 — fundamentos', () => {
  it('a Vida começa cheia (reseta a cada batalha)', () => {
    const s = initBattle({ player: player(), enemy: enemy(), seed: 1 });
    expect(s.player.health).toBe(120);
    expect(s.enemy.health).toBe(120);
    expect(s.status).toBe('ongoing');
  });

  it('ataque básico causa dano ao inimigo', () => {
    const s0 = initBattle({ player: player(), enemy: enemy(), seed: 5 });
    const s1 = resolveRound(s0, attack(), { player: player(), enemy: enemy() });
    expect(s1.enemy.health).toBeLessThan(120);
    expect(s1.round).toBe(1);
  });

  it('é determinístico: mesma seed e ações → mesmo resultado', () => {
    const run = () =>
      simulateBattle({ player: player(), enemy: enemy(), seed: 123 }, () => attack());
    const a = run();
    const b = run();
    expect(a.status).toBe(b.status);
    expect(a.round).toBe(b.round);
    expect(a.enemy.health).toBe(b.enemy.health);
    expect(a.player.health).toBe(b.player.health);
  });

  it('termina em vitória ou derrota (nunca trava)', () => {
    const s = simulateBattle({ player: player(), enemy: enemy(), seed: 7 }, () => attack());
    expect(['victory', 'defeat']).toContain(s.status);
  });
});

describe('engine v2 — recargas', () => {
  it('uma habilidade com recarga fica indisponível e faz fallback ao básico', () => {
    const special = ability({ id: 'p-sp', type: 'damage', slot: 'special', power: 3, cooldown: 2 });
    const p = player([BASIC, DEFEND, special]);
    const e = enemy({ stats: { maxHealth: 400, attack: 5, defense: 0, speed: 1 } });
    let s = initBattle({ player: p, enemy: e, seed: 3 });
    s = resolveRound(s, attack('p-sp'), { player: p, enemy: e });
    expect(s.player.cooldowns['p-sp']).toBeGreaterThan(0);
    const afterSpecial = s.enemy.health;
    const dmgSpecial = 400 - afterSpecial;
    s = resolveRound(s, attack('p-sp'), { player: p, enemy: e });
    const dmgFallback = afterSpecial - s.enemy.health;
    expect(dmgFallback).toBeLessThan(dmgSpecial);
  });
});

describe('engine v2 — efeitos', () => {
  const passiveEnemy = enemy({ stats: { maxHealth: 500, attack: 0, defense: 0, speed: 1 } });

  it('defesa mitiga o próximo golpe recebido', () => {
    // Inimigo mais lento: o jogador age primeiro (guarda antes de o inimigo atacar).
    const e = enemy({ stats: { maxHealth: 500, attack: 40, defense: 0, speed: 3 } });
    const p = player([BASIC, DEFEND]);
    let s1 = initBattle({ player: p, enemy: e, seed: 8 });
    s1 = resolveRound(s1, attack('p-atk'), { player: p, enemy: e });
    const dmgNoGuard = 120 - s1.player.health;
    let s2 = initBattle({ player: p, enemy: e, seed: 8 });
    s2 = resolveRound(s2, attack('p-def'), { player: p, enemy: e });
    const dmgGuard = 120 - s2.player.health;
    expect(dmgGuard).toBeLessThan(dmgNoGuard);
  });

  it('escudo absorve dano antes da vida', () => {
    const shield = ability({ id: 'p-sh', type: 'shield', slot: 'tactical', power: 0.5, cooldown: 3, duration: 3 });
    const e = enemy({ stats: { maxHealth: 500, attack: 20, defense: 0, speed: 3 } });
    const p = player([BASIC, DEFEND, shield]);
    let s = initBattle({ player: p, enemy: e, seed: 4 });
    s = resolveRound(s, attack('p-sh'), { player: p, enemy: e });
    expect(s.player.shield).toBeGreaterThan(0);
    expect(s.player.health).toBeGreaterThan(60);
  });

  it('cura restaura vida', () => {
    const heal = ability({ id: 'p-heal', type: 'heal', slot: 'tactical', power: 0.3, cooldown: 3 });
    const e = enemy({ stats: { maxHealth: 500, attack: 25, defense: 0, speed: 3 } });
    const p = player([BASIC, DEFEND, heal]);
    let s = initBattle({ player: p, enemy: e, seed: 2 });
    s = resolveRound(s, attack('p-atk'), { player: p, enemy: e });
    const hurt = s.player.health;
    s = resolveRound(s, attack('p-heal'), { player: p, enemy: e });
    expect(s.log.some((ev) => ev.kind === 'heal' && (ev.heal ?? 0) > 0)).toBe(true);
    expect(hurt).toBeLessThan(120);
  });

  it('buff aumenta o dano causado', () => {
    const buff = ability({ id: 'p-buff', type: 'buff', slot: 'tactical', power: 0.5, cooldown: 3, duration: 3 });
    const p = player([BASIC, DEFEND, buff]);
    let s1 = initBattle({ player: p, enemy: passiveEnemy, seed: 6 });
    s1 = resolveRound(s1, attack('p-atk'), { player: p, enemy: passiveEnemy });
    const dmgNoBuff = 500 - s1.enemy.health;
    let s2 = initBattle({ player: p, enemy: passiveEnemy, seed: 6 });
    s2 = resolveRound(s2, attack('p-buff'), { player: p, enemy: passiveEnemy });
    const before = s2.enemy.health;
    s2 = resolveRound(s2, attack('p-atk'), { player: p, enemy: passiveEnemy });
    const dmgWithBuff = before - s2.enemy.health;
    expect(dmgWithBuff).toBeGreaterThan(dmgNoBuff);
  });

  it('debuff reduz a defesa do alvo (aumenta o dano recebido)', () => {
    const debuff = ability({ id: 'p-deb', type: 'debuff', slot: 'tactical', power: 0.5, cooldown: 3, duration: 3 });
    const tanky = enemy({ stats: { maxHealth: 500, attack: 0, defense: 40, speed: 1 } });
    const p = player([BASIC, DEFEND, debuff]);
    let s1 = initBattle({ player: p, enemy: tanky, seed: 9 });
    s1 = resolveRound(s1, attack('p-atk'), { player: p, enemy: tanky });
    const dmgNoDebuff = 500 - s1.enemy.health;
    let s2 = initBattle({ player: p, enemy: tanky, seed: 9 });
    s2 = resolveRound(s2, attack('p-deb'), { player: p, enemy: tanky });
    const before = s2.enemy.health;
    s2 = resolveRound(s2, attack('p-atk'), { player: p, enemy: tanky });
    const dmgWithDebuff = before - s2.enemy.health;
    expect(dmgWithDebuff).toBeGreaterThan(dmgNoDebuff);
  });

  it('dano contínuo (dot) reduz a vida ao longo dos turnos', () => {
    const dot = ability({ id: 'p-dot', type: 'damageOverTime', slot: 'special', power: 0.4, cooldown: 2, duration: 3 });
    const p = player([BASIC, DEFEND, dot]);
    const e = enemy({ stats: { maxHealth: 500, attack: 0, defense: 0, speed: 1 } });
    let s = initBattle({ player: p, enemy: e, seed: 11 });
    s = resolveRound(s, attack('p-dot'), { player: p, enemy: e });
    const afterCast = s.enemy.health;
    s = resolveRound(s, attack('p-dot'), { player: p, enemy: e });
    expect(s.enemy.health).toBeLessThan(afterCast);
    expect(s.log.some((ev) => ev.kind === 'dot')).toBe(true);
  });
});

describe('engine v2 — chefes', () => {
  const bossCombatant: Combatant = {
    id: 'boss',
    name: 'Chefe',
    stats: { maxHealth: 200, attack: 25, defense: 10, speed: 5 },
    abilities: [ability({ id: 'boss-atk', type: 'damage', slot: 'basicAttack', power: 1, cooldown: 0 })],
    behaviorProfile: 'bossPattern',
    isBoss: true,
    boss: {
      phaseThresholds: [0.7, 0.35],
      telegraphEveryTurns: 2,
      telegraphPower: 2.5,
      chargingVulnerability: 1.3,
      phaseDamageBonus: 0.15,
    },
  };

  it('o chefe telegrafa um golpe (evento de telegraph)', () => {
    const p = player();
    let s = initBattle({ player: p, enemy: bossCombatant, seed: 3 });
    for (let i = 0; i < 4 && s.status === 'ongoing'; i += 1) {
      s = resolveRound(s, attack('p-atk'), { player: p, enemy: bossCombatant });
    }
    expect(s.log.some((ev) => ev.kind === 'telegraph')).toBe(true);
  });

  it('o chefe muda de fase ao cruzar os limiares de vida', () => {
    const strong = player([ability({ id: 'p-atk', type: 'damage', slot: 'basicAttack', power: 1, cooldown: 0 })]);
    strong.stats = { maxHealth: 300, attack: 80, defense: 20, speed: 30 };
    let s = initBattle({ player: strong, enemy: bossCombatant, seed: 15 });
    for (let i = 0; i < 8 && s.status === 'ongoing'; i += 1) {
      s = resolveRound(s, attack('p-atk'), { player: strong, enemy: bossCombatant });
    }
    expect(s.log.some((ev) => ev.kind === 'phase')).toBe(true);
  });
});
