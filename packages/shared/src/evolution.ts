import type { AttributeKey, AttributeSet } from './types';

/**
 * Requisitos de evolução (permanente). A evolução NÃO depende só de nível:
 * combina nível, constância (semanas com meta), volume mínimo, afinidade de
 * atributo e, opcionalmente, um marco da campanha.
 */
export interface EvolutionRequirements {
  minLevel: number;
  minWeeksGoalMet: number;
  minActivities: number;
  affinityAttribute: AttributeKey;
  affinityThreshold: number;
  /** id do adversário/chefe que precisa ter sido derrotado, ou null. */
  campaignMilestone: string | null;
}

export interface EvolutionProgress {
  level: number;
  weeksGoalMet: number;
  totalActivities: number;
  attributes: AttributeSet;
  defeatedMilestones: readonly string[];
}

export interface RequirementStatus {
  key: 'level' | 'weeks' | 'activities' | 'affinity' | 'campaign';
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
    {
      key: 'affinity',
      label: `Afinidade de atributo ${req.affinityThreshold}`,
      met: progress.attributes[req.affinityAttribute] >= req.affinityThreshold,
      current: progress.attributes[req.affinityAttribute],
      needed: req.affinityThreshold,
    },
  ];

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
