/**
 * Coeficientes de balanceamento do domínio (fonte única de números).
 * As fórmulas que os usam vivem nos módulos correspondentes.
 */
import type { ActivityType, Intensity } from './enums';
import type { AttributeKey } from './types';

/** Curva de XP: xpToNextLevel(n) = floor(BASE * n^EXPONENT). */
export const XP = {
  BASE: 100,
  EXPONENT: 1.6,
  MAX_LEVEL: 99,
} as const;

/** XP base concedido por intensidade percebida (jogador e criatura). */
export const INTENSITY_XP: Record<Intensity, number> = {
  leve: 10,
  moderada: 18,
  intensa: 28,
};

/** Energia de batalha concedida por atividade principal, por intensidade. */
export const INTENSITY_ENERGY: Record<Intensity, number> = {
  leve: 15,
  moderada: 22,
  intensa: 30,
};

/**
 * Regras de duração (v2):
 * - MIN_MINUTES: abaixo disso a atividade é salva no diário, mas NÃO é elegível a recompensa.
 * - CAP_MINUTES: duração usada no cálculo é limitada a este teto (acima é registrada
 *   integralmente no diário, mas a recompensa usa no máximo CAP_MINUTES).
 * Fator de duração: 1 + min(dur, CAP)/CAP * MAX_BONUS.
 */
export const DURATION = {
  MIN_MINUTES: 10,
  CAP_MINUTES: 120,
  MAX_BONUS: 0.5,
} as const;

/**
 * Multiplicadores de recompensa por posição da atividade ELEGÍVEL no dia (v2).
 * 1ª = 100%, 2ª = 25%, 3ª e além = 0%. Nenhuma atividade é bloqueada.
 */
export const DAILY_REWARD_MULTIPLIERS = {
  FIRST: 1,
  SECOND: 0.25,
  REST: 0,
} as const;

/** Teto de energia de batalha acumulada (mantido: `energy` interno = Vigor atual). */
export const REWARD_CAPS = {
  MAX_ENERGY: 100,
} as const;

/**
 * Vigor — recurso de DESCANSO (na UI: "Vigor"). Internamente reaproveita o campo
 * `energy` da criatura como `currentVigor`. Recupera-se com o tempo (offline,
 * app fechado), nunca por anúncios/pagamento/consumíveis.
 * - Recuperação: `floor(elapsedHours × rate)` até MAX.
 * - Taxa base 5/h; sobe até 7/h conforme o atributo Recuperação (nunca elimina o descanso).
 * - Recuperação total ~20h (taxa base) a ~14h (taxa máxima).
 */
export const VIGOR = {
  MAX: 100,
  BASE_RECOVERY_RATE: 5,
  MAX_RECOVERY_RATE: 7,
  /** Cada ponto de atributo Recuperação soma à taxa/hora (satura em MAX_RECOVERY_RATE). */
  RECOVERY_ATTR_SLOPE: 0.05,
  /** Bônus concedido pela 1ª atividade elegível do dia (configurável). */
  ACTIVITY_BONUS: 5,
} as const;

/** Custo de Vigor para ENTRAR em cada tipo de batalha (confirmado na conclusão válida). */
export const BATTLE_VIGOR_COST = {
  normalPve: 12,
  elitePve: 15,
  bossPve: 20,
  friendlyDuel: 10,
} as const;
export type BattleVigorKind = keyof typeof BATTLE_VIGOR_COST;

/** Fração do custo efetivamente consumida conforme o resultado. */
export const BATTLE_VIGOR = {
  VICTORY_COST_MULTIPLIER: 1,
  DEFEAT_COST_MULTIPLIER: 0.5,
} as const;

/**
 * Limites diários de PvE (batalhas da Jornada). A atividade real continua sendo a
 * PRINCIPAL fonte de XP; o PvE é secundário e limitado para evitar farm.
 * - Só VITÓRIAS contam para o limite (derrotas não consomem vitória).
 * - No máximo PVE_DAILY_WIN_LIMIT vitórias recompensadas por dia (fuso do usuário).
 * - As vitórias somam no máximo PVE_DAILY_XP_CAP_MULTIPLIER do XP-base de uma
 *   atividade padrão (~PVE_XP_PER_WIN_MULTIPLIER por vitória).
 * - O chefe conta como 1 das vitórias com o MESMO XP limitado (o valor do chefe vem
 *   do desbloqueio de região / emblema / evolução / narrativa — nunca de moeda).
 */
export const PVE_DAILY_WIN_LIMIT = 5;
export const PVE_XP_PER_WIN_MULTIPLIER = 0.06;
export const PVE_DAILY_XP_CAP_MULTIPLIER = 0.3;

/** Referência de "atividade padrão" para ancorar a XP limitada do PvE. */
export const STANDARD_ACTIVITY = {
  intensity: 'moderada' as Intensity,
  durationMinutes: 60,
} as const;

/**
 * Duelos amistosos (entre membros da mesma liga). Sem XP/atributos/liga/streak.
 * Consomem Vigor apenas do desafiante (BATTLE_VIGOR_COST.friendlyDuel). Limite de
 * desafios por oponente por dia, para manter amistoso e evitar spam.
 */
export const DUEL = {
  DAILY_CHALLENGES_PER_OPPONENT: 3,
} as const;

/** Atributo primário reforçado por cada tipo de atividade. */
export const ACTIVITY_AFFINITY: Record<ActivityType, AttributeKey> = {
  musculacao: 'strength',
  corrida: 'endurance',
  caminhada: 'recovery',
  ciclismo: 'endurance',
  natacao: 'endurance',
  esporte_coletivo: 'agility',
  funcional: 'strength',
  mobilidade: 'recovery',
  outro: 'discipline',
};

/** Bônus de ranking (limitados para não superar o cumprimento da própria meta). */
export const RANKING = {
  STREAK_BONUS_PER_WEEK: 2,
  STREAK_BONUS_CAP_WEEKS: 5,
  PERFECT_WEEK_BONUS: 5,
} as const;

/**
 * Constantes do motor de batalha v2 (determinístico, por recargas). Sem energia
 * de combate: o Vigor governa a ENTRADA; as recargas governam o RITMO em batalha.
 */
export const BATTLE = {
  /** Variância determinística do dano em [1-V, 1+V]. */
  VARIANCE: 0.05,
  /** Multiplicador de dano recebido enquanto em postura defensiva (guarda). */
  /** Guarda oficial: recebe 30% do dano, portanto bloqueia 70%. */
  DEFEND_MITIGATION: 0.3,
  /** Peso da defesa do alvo subtraído do dano bruto. */
  DEFENSE_FACTOR: 0.5,
  /** Dano mínimo garantido (evita empates infinitos). */
  MIN_DAMAGE: 1,
  /** Chance de crítico (limitada) e seu multiplicador. */
  CRIT_CHANCE: 0,
  CRIT_MULTIPLIER: 1.15,
  /** Fração do dano refletida por um contra-ataque armado. */
  COUNTER_FRACTION: 0.5,
  /** Salvaguarda contra empates infinitos. */
  MAX_TURNS: 60,
} as const;

/** Tipos de dificuldade de adversário (governam potência e custo de Vigor). */
export type DifficultyType = 'common' | 'elite' | 'boss';

/**
 * Faixa-alvo de battlePower do adversário como fração do battlePower do jogador,
 * por dificuldade. O escalonamento é HÍBRIDO: nível-base + crescimento limitado,
 * mirando esta faixa (nunca copia o nível do jogador).
 */
export const DIFFICULTY_POWER_RANGE: Record<DifficultyType, readonly [number, number]> = {
  common: [0.84, 0.94],
  elite: [0.96, 1.05],
  boss: [1.04, 1.12],
};

/** Limites do fator de escala (evita variações absurdas ao mirar a faixa-alvo). */
export const ENEMY_SCALE_CLAMP = { MIN: 0.6, MAX: 1.8 } as const;

/** Pesos do cálculo de battlePower (soma ponderada de stats + habilidades + evolução). */
export const BATTLE_POWER_WEIGHTS = {
  health: 0.5,
  attack: 3,
  defense: 2,
  speed: 1,
  perAbility: 5,
  perEvolutionStage: 20,
} as const;

/** Durações-alvo de batalha por dificuldade (para referência de balanceamento). */
export const BATTLE_DURATION_TURNS: Record<DifficultyType, readonly [number, number]> = {
  common: [3, 6],
  elite: [5, 8],
  boss: [8, 14],
};
