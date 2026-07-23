import { BATTLE } from '../constants';
import { createRng } from '../rng';
import { chooseEnemyAction } from './ai';
import { bossOutgoingMultiplier, bossPhase, bossShouldTelegraph } from './boss';
import { applyDamageToPool, computeDamage } from './damage';
import type {
  BattleEvent,
  BattleState,
  BattleStatus,
  Combatant,
  CombatantState,
  PlannedAction,
  Side,
} from './types';

export interface BattleInit {
  player: Combatant;
  enemy: Combatant;
  seed: number;
}

interface Working {
  player: CombatantState;
  enemy: CombatantState;
  round: number;
  cursor: number;
  seed: number;
  log: BattleEvent[];
  status: BattleStatus;
}

function freshState(): CombatantState {
  return {
    health: 0,
    shield: 0,
    cooldowns: {},
    effects: [],
    guarding: false,
    countering: 0,
    stunned: false,
    charging: false,
    phase: 0,
    turnsSinceTelegraph: 0,
    exposed: 0,
  };
}

export function initBattle(init: BattleInit): BattleState {
  const player: CombatantState = { ...freshState(), health: init.player.stats.maxHealth };
  const enemy: CombatantState = { ...freshState(), health: init.enemy.stats.maxHealth };
  return {
    player,
    enemy,
    round: 0,
    status: 'ongoing',
    log: [],
    seed: init.seed,
    rngCursor: 0,
  };
}

/** Sorteio determinístico em [0,1) que avança o cursor. */
function draw(w: Working): number {
  const r = createRng((w.seed ^ (w.cursor * 0x9e3779b9)) >>> 0).next();
  w.cursor += 1;
  return r;
}

function varianceFactor(w: Working): number {
  return 1 - BATTLE.VARIANCE + draw(w) * (2 * BATTLE.VARIANCE);
}

function buffMultiplier(state: CombatantState): number {
  return 1 + state.effects.filter((e) => e.type === 'buff').reduce((s, e) => s + e.magnitude, 0);
}

function defenseDebuffMultiplier(state: CombatantState): number {
  const total = state.effects
    .filter((e) => e.type === 'debuff')
    .reduce((s, e) => s + e.magnitude, 0);
  return Math.max(0, 1 - total);
}

function resolveDamage(
  attackerDef: Combatant,
  attackerState: CombatantState,
  defenderDef: Combatant,
  defenderState: CombatantState,
  abilityPower: number,
  w: Working,
): { damage: number; rawDamage: number; blockedDamage: number; crit: boolean } {
  const bossOut = attackerDef.isBoss && attackerDef.boss
    ? bossOutgoingMultiplier(attackerDef.boss, attackerState.phase)
    : 1;
  // Defensor chefe fica vulnerável enquanto carrega (janela de contra-jogo).
  const resistance =
    defenderDef.isBoss && defenderDef.boss && (defenderState.charging || defenderState.exposed > 0)
      ? defenderDef.boss.chargingVulnerability
      : 1;

  // O MVP não usa crítico aleatório: decisões e telegraphs determinam o resultado.
  const crit = false;
  const variance = varianceFactor(w);
  const input = {
    attackerAttack: attackerDef.stats.attack,
    abilityPower: abilityPower * bossOut,
    defenderDefense: defenderDef.stats.defense,
    attackerBuffMultiplier: buffMultiplier(attackerState),
    defenderDefenseMultiplier: defenseDebuffMultiplier(defenderState),
    resistanceMultiplier: resistance,
    variance,
    crit,
  };
  const rawDamage = computeDamage({ ...input, guarding: false });
  const wasGuarding = defenderState.guarding;
  const damage = wasGuarding ? computeDamage({ ...input, guarding: true }) : rawDamage;
  const blockedDamage = Math.max(0, rawDamage - damage);
  if (wasGuarding) defenderState.guarding = false;

  const pool = applyDamageToPool(defenderState.health, defenderState.shield, damage);
  defenderState.health = pool.health;
  defenderState.shield = pool.shield;

  // Contra-ataque: reflete parte do dano recebido, se armado.
  if (defenderState.countering > 0 && attackerState.health > 0) {
    const reflected = Math.max(
      BATTLE.MIN_DAMAGE,
      Math.round(damage * BATTLE.COUNTER_FRACTION * defenderState.countering),
    );
    const back = applyDamageToPool(attackerState.health, attackerState.shield, reflected);
    attackerState.health = back.health;
    attackerState.shield = back.shield;
    w.log.push({
      round: w.round,
      side: defenderDef.isBoss ? 'enemy' : 'player',
      kind: 'counter',
      damage: reflected,
      text: `${defenderDef.name} revida com um contra-ataque (${reflected} de dano).`,
    });
  }

  return { damage, rawDamage, blockedDamage, crit };
}

function applyAction(
  side: Side,
  action: PlannedAction,
  attackerDef: Combatant,
  attackerState: CombatantState,
  defenderDef: Combatant,
  defenderState: CombatantState,
  w: Working,
): void {
  // Ao agir, o próprio ator abandona guarda e contra-ataque anteriores.
  attackerState.countering = 0;

  let ability = attackerDef.abilities.find((a) => a.id === action.abilityId);
  if (!ability || (attackerState.cooldowns[ability.id] ?? 0) > 0) {
    ability =
      attackerDef.abilities.find((a) => a.slot === 'basicAttack') ?? attackerDef.abilities[0];
  }
  if (!ability) {
    return;
  }
  // +1 porque o upkeep do próprio round acontece após a ação. Assim cooldown 1
  // realmente bloqueia o turno seguinte, em vez de desaparecer imediatamente.
  attackerState.cooldowns[ability.id] = ability.cooldown + 1;

  switch (ability.type) {
    case 'damage': {
      const { damage: shown, rawDamage, blockedDamage, crit } = resolveDamage(
        attackerDef,
        attackerState,
        defenderDef,
        defenderState,
        ability.power,
        w,
      );
      w.log.push({
        round: w.round,
        side,
        kind: 'ability',
        abilityName: ability.name,
        damage: shown,
        rawDamage,
        blockedDamage,
        text: blockedDamage > 0
          ? `${attackerDef.name} causaria ${rawDamage} de dano. A Guarda bloqueou ${blockedDamage}. ${defenderDef.name} recebeu ${shown} de dano.`
          : `${attackerDef.name} usou ${ability.name}${crit ? ' (crítico!)' : ''} e causou ${shown} de dano.`,
      });
      break;
    }
    case 'damageOverTime': {
      const perTurn = Math.max(BATTLE.MIN_DAMAGE, Math.round(attackerDef.stats.attack * ability.power));
      defenderState.effects.push({
        sourceAbilityId: ability.id,
        type: 'damageOverTime',
        remainingTurns: ability.duration,
        magnitude: perTurn,
      });
      w.log.push({
        round: w.round,
        side,
        kind: 'dot',
        abilityName: ability.name,
        text: `${attackerDef.name} usou ${ability.name}: dano contínuo por ${ability.duration} turnos.`,
      });
      break;
    }
    case 'defense': {
      attackerState.guarding = true;
      w.log.push({
        round: w.round,
        side,
        kind: 'defense',
        abilityName: ability.name,
        text: `${attackerDef.name} assumiu ${ability.name} (reduz o próximo golpe).`,
      });
      break;
    }
    case 'shield': {
      const amount = Math.max(1, Math.round(attackerDef.stats.maxHealth * ability.power));
      attackerState.shield += amount;
      attackerState.effects.push({
        sourceAbilityId: ability.id,
        type: 'shield',
        remainingTurns: ability.duration,
        magnitude: amount,
      });
      w.log.push({
        round: w.round,
        side,
        kind: 'shield',
        abilityName: ability.name,
        text: `${attackerDef.name} ergueu ${ability.name} (+${amount} de escudo).`,
      });
      break;
    }
    case 'heal': {
      const amount = Math.max(1, Math.round(attackerDef.stats.maxHealth * ability.power));
      const before = attackerState.health;
      attackerState.health = Math.min(attackerDef.stats.maxHealth, attackerState.health + amount);
      const healed = attackerState.health - before;
      w.log.push({
        round: w.round,
        side,
        kind: 'heal',
        abilityName: ability.name,
        heal: healed,
        text: `${attackerDef.name} usou ${ability.name} e recuperou ${healed} de vida.`,
      });
      break;
    }
    case 'buff': {
      attackerState.effects.push({
        sourceAbilityId: ability.id,
        type: 'buff',
        remainingTurns: ability.duration,
        magnitude: ability.power,
      });
      w.log.push({
        round: w.round,
        side,
        kind: 'buff',
        abilityName: ability.name,
        text: `${attackerDef.name} usou ${ability.name} (ataque reforçado).`,
      });
      break;
    }
    case 'debuff': {
      defenderState.effects.push({
        sourceAbilityId: ability.id,
        type: 'debuff',
        remainingTurns: ability.duration,
        magnitude: ability.power,
      });
      w.log.push({
        round: w.round,
        side,
        kind: 'debuff',
        abilityName: ability.name,
        text: `${attackerDef.name} usou ${ability.name} (defesa do alvo reduzida).`,
      });
      break;
    }
    case 'control': {
      defenderState.stunned = true;
      w.log.push({
        round: w.round,
        side,
        kind: 'control',
        abilityName: ability.name,
        text: `${attackerDef.name} usou ${ability.name}: o alvo perde o próximo turno.`,
      });
      break;
    }
    case 'counter': {
      attackerState.countering = ability.power;
      w.log.push({
        round: w.round,
        side,
        kind: 'counter',
        abilityName: ability.name,
        text: `${attackerDef.name} preparou ${ability.name} (contra-ataque armado).`,
      });
      break;
    }
    case 'cooldownReduction': {
      const reduce = Math.max(1, Math.round(ability.power));
      for (const id of Object.keys(attackerState.cooldowns)) {
        attackerState.cooldowns[id] = Math.max(0, (attackerState.cooldowns[id] ?? 0) - reduce);
      }
      w.log.push({
        round: w.round,
        side,
        kind: 'cooldownReduction',
        abilityName: ability.name,
        text: `${attackerDef.name} usou ${ability.name} (recargas aceleradas).`,
      });
      break;
    }
    default:
      break;
  }
}

function takeEnemyTurn(
  enemyDef: Combatant,
  enemyState: CombatantState,
  playerDef: Combatant,
  playerState: CombatantState,
  w: Working,
): void {
  // Mecânica de chefe: telegrafa e desfere no turno seguinte (padrão observável).
  if (enemyDef.isBoss && enemyDef.boss) {
    if (enemyState.charging) {
      const correctlyGuarded = playerState.guarding;
      enemyState.countering = 0;
      const { damage: shown, rawDamage, blockedDamage } = resolveDamage(
        enemyDef,
        enemyState,
        playerDef,
        playerState,
        enemyDef.boss.telegraphPower,
        w,
      );
      w.log.push({
        round: w.round,
        side: 'enemy',
        kind: 'ability',
        abilityName: 'Golpe Cataclísmico',
        damage: shown,
        rawDamage,
        blockedDamage,
        text: blockedDamage > 0
          ? `${enemyDef.name} causaria ${rawDamage} de dano. A Guarda bloqueou ${blockedDamage}. ${playerDef.name} recebeu ${shown} de dano.`
          : `${enemyDef.name} desfere o golpe telegrafado (${shown} de dano)!`,
      });
      enemyState.charging = false;
      enemyState.turnsSinceTelegraph = 0;
      if (correctlyGuarded) {
        enemyState.stunned = true;
        enemyState.exposed = 2;
        w.log.push({
          round: w.round,
          side: 'player',
          kind: 'phase',
          text: `${playerDef.name} bloqueia no tempo certo — ${enemyDef.name} fica vulnerável!`,
        });
      }
      return;
    }
    if (bossShouldTelegraph(enemyDef.boss, enemyState.turnsSinceTelegraph)) {
      enemyState.charging = true;
      w.log.push({
        round: w.round,
        side: 'enemy',
        kind: 'telegraph',
        text: `${enemyDef.name} concentra energia — um golpe poderoso vem aí!`,
      });
      return;
    }
    enemyState.turnsSinceTelegraph += 1;
  }

  const action = chooseEnemyAction({
    enemy: enemyDef,
    state: enemyState,
    playerHealthFraction:
      playerDef.stats.maxHealth > 0 ? playerState.health / playerDef.stats.maxHealth : 1,
    tiebreak: draw(w),
    round: w.round,
  });
  applyAction('enemy', action, enemyDef, enemyState, playerDef, playerState, w);
}

/** Aplica dot/expiração de efeitos e decremento de recargas ao fim do round. */
function upkeep(def: Combatant, state: CombatantState, side: Side, w: Working): void {
  // Dano contínuo (dot).
  let dotDamage = 0;
  for (const effect of state.effects) {
    if (effect.type === 'damageOverTime') {
      dotDamage += effect.magnitude;
    }
  }
  if (dotDamage > 0) {
    const pool = applyDamageToPool(state.health, state.shield, dotDamage);
    state.health = pool.health;
    state.shield = pool.shield;
    w.log.push({
      round: w.round,
      side,
      kind: 'dot',
      damage: dotDamage,
      text: `${def.name} sofre ${dotDamage} de dano contínuo.`,
    });
  }

  // Expiração de efeitos.
  const survivors = [];
  for (const effect of state.effects) {
    const remaining = effect.remainingTurns - 1;
    if (remaining > 0) {
      survivors.push({ ...effect, remainingTurns: remaining });
    } else if (effect.type === 'shield') {
      // Escudo expira: remove o que restou dele.
      state.shield = Math.max(0, state.shield - effect.magnitude);
    }
  }
  state.effects = survivors;

  // Recargas.
  for (const id of Object.keys(state.cooldowns)) {
    state.cooldowns[id] = Math.max(0, (state.cooldowns[id] ?? 0) - 1);
  }
  state.exposed = Math.max(0, state.exposed - 1);
}

function updateBossPhase(def: Combatant, state: CombatantState, w: Working): void {
  if (!def.isBoss || !def.boss) {
    return;
  }
  const fraction = def.stats.maxHealth > 0 ? state.health / def.stats.maxHealth : 0;
  const phase = bossPhase(def.boss, fraction);
  if (phase > state.phase) {
    state.phase = phase;
    w.log.push({
      round: w.round,
      side: 'enemy',
      kind: 'phase',
      text: `${def.name} muda de postura — a batalha se intensifica (fase ${phase + 1}).`,
    });
  }
}

/**
 * Resolve um round completo (ambos agem, na ordem de velocidade; empate → jogador).
 * Determinístico dada a mesma seed e as mesmas ações do jogador.
 */
export function resolveRound(
  state: BattleState,
  playerAction: PlannedAction,
  init: { player: Combatant; enemy: Combatant },
): BattleState {
  if (state.status !== 'ongoing') {
    return state;
  }

  const w: Working = {
    player: {
      ...state.player,
      cooldowns: { ...state.player.cooldowns },
      effects: state.player.effects.map((e) => ({ ...e })),
    },
    enemy: {
      ...state.enemy,
      cooldowns: { ...state.enemy.cooldowns },
      effects: state.enemy.effects.map((e) => ({ ...e })),
    },
    round: state.round + 1,
    cursor: state.rngCursor,
    seed: state.seed,
    log: [...state.log],
    status: 'ongoing',
  };

  // Um golpe anunciado sempre deixa uma janela real de resposta. Mesmo um chefe
  // mais veloz só resolve a carga depois da escolha do jogador.
  const order: Side[] = w.enemy.charging
    ? ['player', 'enemy']
    : init.enemy.stats.speed > init.player.stats.speed
      ? ['enemy', 'player']
      : ['player', 'enemy'];

  for (const side of order) {
    if (w.status !== 'ongoing') {
      break;
    }
    if (side === 'player') {
      if (w.player.stunned) {
        w.player.stunned = false;
        w.player.countering = 0;
        w.log.push({
          round: w.round,
          side: 'player',
          kind: 'stunned',
          text: `${init.player.name} está atordoado e perde o turno.`,
        });
      } else {
        applyAction('player', playerAction, init.player, w.player, init.enemy, w.enemy, w);
      }
      updateBossPhase(init.enemy, w.enemy, w);
      if (w.enemy.health <= 0) {
        w.status = 'victory';
      }
    } else {
      if (w.enemy.stunned) {
        w.enemy.stunned = false;
        w.enemy.countering = 0;
        w.log.push({
          round: w.round,
          side: 'enemy',
          kind: 'stunned',
          text: `${init.enemy.name} está atordoado e perde o turno.`,
        });
      } else {
        takeEnemyTurn(init.enemy, w.enemy, init.player, w.player, w);
      }
      if (w.player.health <= 0) {
        w.status = 'defeat';
      }
    }
  }

  // Upkeep de fim de round (dot/efeitos/recargas) — só se a batalha continua.
  if (w.status === 'ongoing') {
    upkeep(init.player, w.player, 'player', w);
    upkeep(init.enemy, w.enemy, 'enemy', w);
    updateBossPhase(init.enemy, w.enemy, w);
    if (w.enemy.health <= 0) {
      w.status = 'victory';
    } else if (w.player.health <= 0) {
      w.status = 'defeat';
    }
  }

  const expectedTurnLimit = init.enemy.isBoss
    ? 14
    : init.enemy.behaviorProfile === 'adaptive'
      ? 8
      : 6;
  if (w.status === 'ongoing' && w.round >= Math.min(BATTLE.MAX_TURNS, expectedTurnLimit)) {
    const playerFrac = w.player.health / init.player.stats.maxHealth;
    const enemyFrac = w.enemy.health / init.enemy.stats.maxHealth;
    w.status = playerFrac >= enemyFrac ? 'victory' : 'defeat';
  }

  return {
    player: w.player,
    enemy: w.enemy,
    round: w.round,
    status: w.status,
    log: w.log,
    seed: w.seed,
    rngCursor: w.cursor,
  };
}

/** Executa a batalha inteira com uma política do jogador (útil em testes). */
export function simulateBattle(
  init: BattleInit,
  playerPolicy: (state: BattleState) => PlannedAction,
): BattleState {
  let state = initBattle(init);
  let guard = 0;
  while (state.status === 'ongoing' && guard < BATTLE.MAX_TURNS + 1) {
    state = resolveRound(state, playerPolicy(state), init);
    guard += 1;
  }
  return state;
}
