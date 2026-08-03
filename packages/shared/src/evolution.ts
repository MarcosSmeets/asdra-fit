import type { AttributeKey, AttributeSet } from './types';

/** Versão das regras de evolução (persistida no histórico p/ auditoria). */
export const EVOLUTION_CALCULATION_VERSION = 2;

/**
 * Estágios evolutivos dos Adaris (Build 5). Todo Adari nasce em BASE e avança
 * um estágio por vez até PERFECT — nunca pula, nunca regride.
 */
export enum AdariEvolutionStage {
  BASE = 'BASE',
  EVOLUTION_1 = 'EVOLUTION_1',
  EVOLUTION_2 = 'EVOLUTION_2',
  PERFECT = 'PERFECT',
}

/** Ordem canônica dos estágios (também define o inteiro persistido 0..3). */
export const ADARI_STAGE_ORDER: readonly AdariEvolutionStage[] = [
  AdariEvolutionStage.BASE,
  AdariEvolutionStage.EVOLUTION_1,
  AdariEvolutionStage.EVOLUTION_2,
  AdariEvolutionStage.PERFECT,
];

/** Texto exibido por estágio (spec §14). Único lugar com esses rótulos. */
export const ADARI_STAGE_LABEL: Readonly<Record<AdariEvolutionStage, string>> = {
  [AdariEvolutionStage.BASE]: 'Base',
  [AdariEvolutionStage.EVOLUTION_1]: 'EV 1',
  [AdariEvolutionStage.EVOLUTION_2]: 'EV 2',
  [AdariEvolutionStage.PERFECT]: 'Evolução Perfeita',
};

/**
 * Mapeamento estágio ⇄ inteiro persistido (SQLite/Postgres usam Int 0..3).
 * O valor legado 1 ("evoluído" do modelo antigo) vira EVOLUTION_1 por decisão
 * de migração do Build 5 — os inteiros se alinham sem migração de dados.
 */
export function stageToInt(stage: AdariEvolutionStage): number {
  return ADARI_STAGE_ORDER.indexOf(stage);
}

export function stageFromInt(value: number): AdariEvolutionStage {
  const index = Math.max(0, Math.min(ADARI_STAGE_ORDER.length - 1, Math.trunc(value)));
  return ADARI_STAGE_ORDER[index]!;
}

/** Próximo estágio da linha, ou null quando já é PERFECT. */
export function nextEvolutionStage(stage: AdariEvolutionStage): AdariEvolutionStage | null {
  const index = stageToInt(stage);
  return ADARI_STAGE_ORDER[index + 1] ?? null;
}

/** Transição válida = exatamente um passo à frente (nunca pular/regredir). */
export function isValidStageTransition(
  from: AdariEvolutionStage,
  to: AdariEvolutionStage,
): boolean {
  return stageToInt(to) === stageToInt(from) + 1;
}

/**
 * Requisitos de evolução (permanente). A evolução NÃO depende só de nível:
 * combina nível, constância (semanas com meta), volume, Vínculo, afinidade de
 * atributo (quando exigida) e, opcionalmente, um marco da campanha.
 */
export interface EvolutionRequirements {
  minLevel: number;
  minWeeksGoalMet: number;
  minActivities: number;
  /** Vínculo mínimo (0 = sem exigência). */
  minBond: number;
  /** Atributo de afinidade exigido, ou null quando o estágio não exige. */
  affinityAttribute: AttributeKey | null;
  affinityThreshold: number;
  /** id do adversário/chefe que precisa ter sido derrotado, ou null. */
  campaignMilestone: string | null;
}

export interface EvolutionProgress {
  level: number;
  weeksGoalMet: number;
  totalActivities: number;
  bond: number;
  attributes: AttributeSet;
  defeatedMilestones: readonly string[];
}

export interface RequirementStatus {
  key: 'level' | 'weeks' | 'activities' | 'bond' | 'affinity' | 'campaign';
  label: string;
  met: boolean;
  current: number | boolean;
  needed: number | boolean;
}

export interface EvolutionCheck {
  available: boolean;
  requirements: RequirementStatus[];
}

export function checkEvolution(
  progress: EvolutionProgress,
  req: EvolutionRequirements,
): EvolutionCheck {
  const requirements: RequirementStatus[] = [
    {
      key: 'level',
      label: `Nível ${req.minLevel}`,
      met: progress.level >= req.minLevel,
      current: progress.level,
      needed: req.minLevel,
    },
    {
      key: 'weeks',
      label: `${req.minWeeksGoalMet} semanas com meta cumprida`,
      met: progress.weeksGoalMet >= req.minWeeksGoalMet,
      current: progress.weeksGoalMet,
      needed: req.minWeeksGoalMet,
    },
    {
      key: 'activities',
      label: `${req.minActivities} atividades registradas`,
      met: progress.totalActivities >= req.minActivities,
      current: progress.totalActivities,
      needed: req.minActivities,
    },
  ];

  if (req.minBond > 0) {
    requirements.push({
      key: 'bond',
      label: `Vínculo ${req.minBond}`,
      met: progress.bond >= req.minBond,
      current: progress.bond,
      needed: req.minBond,
    });
  }

  if (req.affinityAttribute) {
    requirements.push({
      key: 'affinity',
      label: `Afinidade de atributo ${req.affinityThreshold}`,
      met: progress.attributes[req.affinityAttribute] >= req.affinityThreshold,
      current: progress.attributes[req.affinityAttribute],
      needed: req.affinityThreshold,
    });
  }

  if (req.campaignMilestone) {
    const met = progress.defeatedMilestones.includes(req.campaignMilestone);
    requirements.push({
      key: 'campaign',
      label: 'Marco da campanha concluído',
      met,
      current: met,
      needed: true,
    });
  }

  return { available: requirements.every((r) => r.met), requirements };
}

export function isEvolutionAvailable(
  progress: EvolutionProgress,
  req: EvolutionRequirements,
): boolean {
  return checkEvolution(progress, req).available;
}
