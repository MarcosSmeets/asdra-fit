import type { AbilitySlot, AbilityType } from '../ability';

/** Stats de batalha (sem energia — o combate v2 usa recargas por turno). */
export interface BattleStats {
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
}

/** Perfis de IA determinísticos (o perfil do jogador é ignorado pelo motor). */
export type BehaviorProfile =
  | 'aggressive'
  | 'defensive'
  | 'adaptive'
  | 'support'
  | 'bossPattern';

/** Habilidade como o motor a consome (derivada de AbilityDefinition). */
export interface BattleAbility {
  id: string;
  name: string;
  slot: AbilitySlot;
  type: AbilityType;
  /** Escalar do efeito (multiplicador de dano, fração de cura/escudo/mitigação, etc.). */
  power: number;
  /** Recarga em turnos (0 = utilizável todo turno). */
  cooldown: number;
  /** Duração em turnos de efeitos persistentes (buff/debuff/dot/escudo). */
  duration: number;
}

/** Configuração de chefe: fases (limiares de vida) e mecânicas telegrafadas. */
export interface BossConfig {
  /** Frações de vida (desc.) que disparam mudança de fase, ex.: [0.7, 0.35]. */
  phaseThresholds: number[];
  /** A cada N turnos o chefe TELEGRAFA um golpe forte (carrega e desfere no turno seguinte). */
  telegraphEveryTurns: number;
  /** Multiplicador de dano do golpe telegrafado. */
  telegraphPower: number;
  /** Multiplicador de resistência aplicado ENQUANTO carrega (>1 = mais frágil; <1 = resistente). */
  chargingVulnerability: number;
  /** Bônus de dano por fase alcançada (fase 1 = +0, fase 2 = +bonus, ...). */
  phaseDamageBonus: number;
}

export interface Combatant {
  id: string;
  name: string;
  stats: BattleStats;
  /** Até 4 habilidades equipadas (inclui ataque básico e ao menos uma defesa). */
  abilities: BattleAbility[];
  behaviorProfile: BehaviorProfile;
  isBoss: boolean;
  /** Presente apenas para chefes. */
  boss?: BossConfig;
}

/** Ação planejada — no v2 tudo é uma habilidade equipada. */
export type PlannedAction = { type: 'ability'; abilityId: string };

/** Efeito ativo (persistente) sobre um combatente. */
export interface ActiveEffect {
  sourceAbilityId: string;
  type: AbilityType;
  remainingTurns: number;
  /** Grandeza do efeito (multiplicador de ataque, dano por turno do dot, etc.). */
  magnitude: number;
}

export interface CombatantState {
  health: number;
  /** Escudo que absorve dano antes da vida. */
  shield: number;
  /** Recargas por habilidade (id → turnos restantes). */
  cooldowns: Record<string, number>;
  /** Efeitos ativos (buff/debuff/dot/escudo temporário). */
  effects: ActiveEffect[];
  /** Postura defensiva ativa (mitiga o próximo golpe recebido). */
  guarding: boolean;
  /** Contra-ataque armado (reflete parte do dano recebido neste turno). */
  countering: number;
  /** Pulou o próximo turno (controle). */
  stunned: boolean;
  // Estado de chefe:
  /** Golpe telegrafado a desferir no próximo turno (null = não está carregando). */
  charging: boolean;
  /** Fase atual do chefe (0 = inicial). */
  phase: number;
  /** Turnos desde o último telegrafado (para o padrão do chefe). */
  turnsSinceTelegraph: number;
  /** Turnos restantes de abertura após responder corretamente ao telegraph. */
  exposed: number;
}

export type Side = 'player' | 'enemy';

export type BattleEventKind =
  | 'ability'
  | 'defense'
  | 'shield'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'control'
  | 'counter'
  | 'dot'
  | 'cooldownReduction'
  | 'telegraph'
  | 'phase'
  | 'stunned';

export interface BattleEvent {
  round: number;
  side: Side;
  kind: BattleEventKind;
  abilityName?: string;
  damage?: number;
  /** Dano que o golpe causaria antes da Guarda. */
  rawDamage?: number;
  /** Parcela bloqueada pela Guarda. */
  blockedDamage?: number;
  heal?: number;
  /** Mensagem legível para o histórico da UI. */
  text: string;
}

export type BattleStatus = 'ongoing' | 'victory' | 'defeat';

export interface BattleState {
  player: CombatantState;
  enemy: CombatantState;
  round: number;
  status: BattleStatus;
  log: BattleEvent[];
  seed: number;
  rngCursor: number;
}
