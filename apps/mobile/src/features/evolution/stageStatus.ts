/**
 * Status de exibição de cada estágio na Linha Evolutiva (spec §19).
 * Regras: estágios passados são Concluídos; o persistido é o Atual; o próximo
 * é Disponível somente com TODOS os requisitos cumpridos; o resto é Bloqueado
 * (silhueta + pista, sem números hardcoded — eles vêm do conteúdo).
 */
export type StageStatus = 'completed' | 'current' | 'available' | 'blocked';

export function stageStatusFor(
  stageInt: number,
  currentStage: number,
  nextAvailable: boolean,
): StageStatus {
  if (stageInt < currentStage) return 'completed';
  if (stageInt === currentStage) return 'current';
  if (stageInt === currentStage + 1 && nextAvailable) return 'available';
  return 'blocked';
}

export const STAGE_STATUS_LABEL: Readonly<Record<StageStatus, string>> = {
  completed: 'Concluído',
  current: 'Atual',
  available: 'Disponível',
  blocked: 'Bloqueado',
};
