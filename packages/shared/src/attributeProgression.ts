import { DAILY_REWARD_MULTIPLIERS, DURATION } from './constants';
import type { ActivityType, Intensity } from './enums';
import type { AttributeChanges, AttributeKey, AttributeSet } from './types';

/**
 * Progressão de atributos por TREINO (Build 6).
 *
 * Antes, cada atividade somava 1–2 pontos direto no atributo: o ganho era
 * grosseiro e ilegível. Agora a atividade concede PONTOS DE TREINAMENTO; a cada
 * `PROGRESS_REQUIRED` pontos o atributo sobe 1 e o excedente é preservado.
 *
 * Propriedade central de segurança: valor e progresso são DERIVADOS do total
 * acumulado de pontos, do nível e do estágio evolutivo — nunca incrementados no
 * lugar. Recalcular sempre dá o mesmo resultado, então editar/excluir atividade
 * e sincronizar são idempotentes por construção (impossível conceder em dobro).
 */

/** Versão do cálculo de recompensa de atributos (persistida com cada registro). */
export const ATTRIBUTE_REWARD_CALCULATION_VERSION = 1;

/** Atributos treináveis. `health` e `energy` (Vigor) NÃO são treinados. */
export const TRAINABLE_ATTRIBUTES = [
  'strength',
  'endurance',
  'agility',
  'discipline',
  'recovery',
  'spirit',
] as const;

export type TrainableAttribute = (typeof TRAINABLE_ATTRIBUTES)[number];

export function isTrainableAttribute(value: string): value is TrainableAttribute {
  return (TRAINABLE_ATTRIBUTES as readonly string[]).includes(value);
}

export const ATTRIBUTE_TRAINING = {
  /** Pontos de treino necessários para o atributo subir 1. */
  PROGRESS_REQUIRED: 100,
  /** Ganho direto em CADA atributo a cada nível do Adari. */
  LEVEL_UP_GAIN: 1,
} as const;

/** Multiplicador de intensidade sobre a pontuação-base de treino. */
export const INTENSITY_TRAINING_MULTIPLIER: Readonly<Record<Intensity, number>> = {
  leve: 0.8,
  moderada: 1,
  intensa: 1.2,
};

/** Faixas de duração → pontuação-base (a duração satura em DURATION.CAP_MINUTES). */
export const TRAINING_DURATION_BANDS: readonly { minMinutes: number; points: number }[] = [
  { minMinutes: 90, points: 20 },
  { minMinutes: 60, points: 16 },
  { minMinutes: 30, points: 12 },
  { minMinutes: DURATION.MIN_MINUTES, points: 8 },
];

/**
 * Pontuação-base pela duração. Abaixo de `DURATION.MIN_MINUTES` não há treino;
 * acima de `DURATION.CAP_MINUTES` a duração é limitada ao teto.
 */
export function trainingBasePoints(durationMinutes: number): number {
  if (!Number.isFinite(durationMinutes) || durationMinutes < DURATION.MIN_MINUTES) {
    return 0;
  }
  const capped = Math.min(durationMinutes, DURATION.CAP_MINUTES);
  return TRAINING_DURATION_BANDS.find((band) => capped >= band.minMinutes)?.points ?? 0;
}

/** Papéis de afinidade de uma atividade (o complementar é opcional). */
export interface ActivityAttributeAffinity {
  primary: TrainableAttribute;
  secondary: TrainableAttribute;
  tertiary?: TrainableAttribute;
}

/**
 * Mapa central de afinidades. Fonte ÚNICA — nenhuma tela deve ter condicional
 * por tipo de atividade.
 */
export const ACTIVITY_ATTRIBUTE_AFFINITY: Readonly<Record<ActivityType, ActivityAttributeAffinity>> = {
  musculacao: { primary: 'strength', secondary: 'endurance', tertiary: 'discipline' },
  corrida: { primary: 'endurance', secondary: 'agility', tertiary: 'discipline' },
  caminhada: { primary: 'recovery', secondary: 'endurance', tertiary: 'discipline' },
  ciclismo: { primary: 'endurance', secondary: 'agility', tertiary: 'recovery' },
  natacao: { primary: 'endurance', secondary: 'recovery', tertiary: 'agility' },
  esporte_coletivo: { primary: 'agility', secondary: 'endurance', tertiary: 'spirit' },
  funcional: { primary: 'agility', secondary: 'strength', tertiary: 'discipline' },
  mobilidade: { primary: 'recovery', secondary: 'agility', tertiary: 'discipline' },
  // "Outro": sem complementar — a fatia dele volta para o principal (70/30).
  outro: { primary: 'discipline', secondary: 'spirit' },
};

export function affinityFor(activityType: ActivityType): ActivityAttributeAffinity {
  return ACTIVITY_ATTRIBUTE_AFFINITY[activityType] ?? ACTIVITY_ATTRIBUTE_AFFINITY.outro;
}

/** Divisão dos pontos entre os papéis. Sem complementar, a fatia vai ao principal. */
export const AFFINITY_SPLIT = { primary: 0.6, secondary: 0.3, tertiary: 0.1 } as const;

/** Atividades que desenvolvem um atributo, para explicar o sistema na UI. */
export function activitiesTraining(attribute: TrainableAttribute): ActivityType[] {
  return (Object.keys(ACTIVITY_ATTRIBUTE_AFFINITY) as ActivityType[]).filter((type) => {
    const affinity = ACTIVITY_ATTRIBUTE_AFFINITY[type];
    return affinity.primary === attribute || affinity.secondary === attribute;
  });
}

/**
 * Reparte `total` entre os papéis por MAIOR RESTO (Hare): cada papel leva o piso
 * da sua fatia e os pontos que sobram vão aos maiores restos. Assim a soma das
 * partes é SEMPRE igual ao total (sem perder nem inventar ponto). Empate de
 * resto é desempatado pela ordem principal > secundário > complementar.
 */
export function splitTrainingPoints(
  total: number,
  affinity: ActivityAttributeAffinity,
): AttributeChanges {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal === 0) {
    return {};
  }
  const shares = affinity.tertiary
    ? [
        { attribute: affinity.primary, share: AFFINITY_SPLIT.primary },
        { attribute: affinity.secondary, share: AFFINITY_SPLIT.secondary },
        { attribute: affinity.tertiary, share: AFFINITY_SPLIT.tertiary },
      ]
    : [
        { attribute: affinity.primary, share: AFFINITY_SPLIT.primary + AFFINITY_SPLIT.tertiary },
        { attribute: affinity.secondary, share: AFFINITY_SPLIT.secondary },
      ];

  const exact = shares.map((entry, index) => ({
    ...entry,
    index,
    value: safeTotal * entry.share,
  }));
  const parts = exact.map((entry) => ({ ...entry, floor: Math.floor(entry.value) }));
  let remaining = safeTotal - parts.reduce((sum, part) => sum + part.floor, 0);

  const byRemainder = [...parts].sort((a, b) => {
    const restA = a.value - a.floor;
    const restB = b.value - b.floor;
    if (restB !== restA) return restB - restA;
    return a.index - b.index;
  });
  const bonus = new Map<number, number>();
  for (const part of byRemainder) {
    if (remaining <= 0) break;
    bonus.set(part.index, 1);
    remaining -= 1;
  }

  const changes: AttributeChanges = {};
  for (const part of parts) {
    const points = part.floor + (bonus.get(part.index) ?? 0);
    if (points > 0) {
      changes[part.attribute] = (changes[part.attribute] ?? 0) + points;
    }
  }
  return changes;
}

export interface TrainingPointsInput {
  activityType: ActivityType;
  perceivedIntensity: Intensity;
  durationMinutes: number;
}

export interface ActivityTrainingReward {
  /** Pontos antes do multiplicador diário. */
  basePoints: number;
  /** Pontos após duração × intensidade × multiplicador diário. */
  finalPoints: number;
  dailyMultiplier: number;
  baseTrainingChanges: AttributeChanges;
  finalTrainingChanges: AttributeChanges;
  affinity: ActivityAttributeAffinity;
  calculationVersion: number;
}

/**
 * Pontos de treino de UMA atividade, dada a posição dela entre as elegíveis do
 * dia (1ª = 100%, 2ª = 25%, 3ª+ = 0% — a atividade continua salva, só não
 * concede progresso). Determinístico: mesma entrada ⇒ mesma saída.
 */
export function calculateActivityTraining(
  input: TrainingPointsInput,
  rewardEligiblePosition: number,
): ActivityTrainingReward {
  const affinity = affinityFor(input.activityType);
  const base = trainingBasePoints(input.durationMinutes);
  const intensityMultiplier = INTENSITY_TRAINING_MULTIPLIER[input.perceivedIntensity] ?? 1;
  const basePoints = Math.round(base * intensityMultiplier);

  const position = base > 0 ? Math.max(0, Math.floor(rewardEligiblePosition)) : 0;
  const dailyMultiplier = position === 1
    ? DAILY_REWARD_MULTIPLIERS.FIRST
    : position === 2 ? DAILY_REWARD_MULTIPLIERS.SECOND : DAILY_REWARD_MULTIPLIERS.REST;
  const finalPoints = Math.round(basePoints * dailyMultiplier);

  return {
    basePoints,
    finalPoints,
    dailyMultiplier,
    baseTrainingChanges: splitTrainingPoints(basePoints, affinity),
    finalTrainingChanges: splitTrainingPoints(finalPoints, affinity),
    affinity,
    calculationVersion: ATTRIBUTE_REWARD_CALCULATION_VERSION,
  };
}

/** Estado exibido de um atributo: valor atual + progresso rumo ao próximo ponto. */
export interface AdariAttributeProgress {
  attribute: TrainableAttribute;
  value: number;
  trainingProgress: number;
  progressRequired: number;
  /** Total acumulado de pontos de treino (fonte da derivação). */
  trainingTotal: number;
}

/** Quantos pontos inteiros o total de treino já rendeu, e o resto. */
export function trainingBreakdown(trainingTotal: number): { earned: number; remainder: number } {
  const total = Math.max(0, Math.floor(trainingTotal));
  return {
    earned: Math.floor(total / ATTRIBUTE_TRAINING.PROGRESS_REQUIRED),
    remainder: total % ATTRIBUTE_TRAINING.PROGRESS_REQUIRED,
  };
}

/** Ganho acumulado de atributo concedido pelos níveis já alcançados. */
export function levelAttributeBonus(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (safeLevel - 1) * ATTRIBUTE_TRAINING.LEVEL_UP_GAIN;
}

export interface MaterializeAttributesInput {
  baseStats: AttributeSet;
  /** Pontos de treino acumulados por atributo (soma de TODAS as atividades). */
  trainingTotals: AttributeChanges;
  level: number;
  /** Reforço acumulado dos estágios evolutivos já alcançados. */
  stageBoost?: AttributeChanges;
}

export interface MaterializedAttributes {
  values: AttributeSet;
  progress: AdariAttributeProgress[];
}

/**
 * Materializa os atributos a partir dos FATOS (base + treino + nível + estágio).
 * É a única fórmula de valor de atributo do jogo — cliente e servidor usam esta.
 *
 *   valor = base + reforço de estágio + (nível − 1) + ⌊treino ÷ 100⌋
 *
 * `energy` (Vigor) não é materializado aqui: é recurso de descanso.
 */
export function materializeAttributes(input: MaterializeAttributesInput): MaterializedAttributes {
  const levelBonus = levelAttributeBonus(input.level);
  const values: AttributeSet = { ...input.baseStats };
  const progress: AdariAttributeProgress[] = [];

  for (const attribute of TRAINABLE_ATTRIBUTES) {
    const total = Math.max(0, Math.floor(input.trainingTotals[attribute] ?? 0));
    const { earned, remainder } = trainingBreakdown(total);
    values[attribute] = input.baseStats[attribute]
      + (input.stageBoost?.[attribute] ?? 0)
      + levelBonus
      + earned;
    progress.push({
      attribute,
      value: values[attribute],
      trainingProgress: remainder,
      progressRequired: ATTRIBUTE_TRAINING.PROGRESS_REQUIRED,
      trainingTotal: total,
    });
  }

  values.health = input.baseStats.health + (input.stageBoost?.health ?? 0);
  return { values, progress };
}

/** Linha da seção "Atributos treinados" da tela de recompensa. */
export interface AttributeTrainingDisplay {
  attribute: TrainableAttribute;
  /** Valor do atributo depois do treino. */
  value: number;
  /** Valor antes — difere de `value` quando o atributo subiu. */
  previousValue: number;
  previousProgress: number;
  currentProgress: number;
  progressRequired: number;
  /** Pontos de treino recebidos nesta atividade. */
  gained: number;
  /** true quando este treino fez o atributo subir de fato. */
  increased: boolean;
}

/**
 * Traduz "progresso depois" + "pontos ganhos" no antes/depois que a tela mostra
 * (ex.: `Resistência 22 • 34/100 → 42/100  +8`). Só entram os atributos que
 * receberam pontos nesta atividade.
 */
export function describeTrainingGain(
  after: readonly AdariAttributeProgress[],
  gained: AttributeChanges,
): AttributeTrainingDisplay[] {
  const rows: AttributeTrainingDisplay[] = [];
  for (const entry of after) {
    const points = gained[entry.attribute] ?? 0;
    if (points === 0) {
      continue;
    }
    const beforeTotal = Math.max(0, entry.trainingTotal - points);
    const before = trainingBreakdown(beforeTotal);
    const current = trainingBreakdown(entry.trainingTotal);
    const levels = current.earned - before.earned;
    rows.push({
      attribute: entry.attribute,
      value: entry.value,
      previousValue: entry.value - levels,
      previousProgress: before.remainder,
      currentProgress: current.remainder,
      progressRequired: entry.progressRequired,
      gained: points,
      increased: levels > 0,
    });
  }
  return rows;
}

/** Soma dois conjuntos de pontos de treino (nunca abaixo de zero). */
export function addTrainingTotals(
  current: AttributeChanges,
  delta: AttributeChanges,
): AttributeChanges {
  const out: AttributeChanges = { ...current };
  for (const key of Object.keys(delta) as AttributeKey[]) {
    out[key] = Math.max(0, (out[key] ?? 0) + (delta[key] ?? 0));
  }
  return out;
}
