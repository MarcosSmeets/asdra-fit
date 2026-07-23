import { computeVigorRecoveryRate, recoverVigor, type VigorState } from '@ad-sidera/shared';
import type { SqlDatabase } from '../db/types';
import type { CreatureState } from '../db/models';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { nowIso } from '../utils/datetime';

/** Lê o estado de Vigor a partir do agregado da criatura. */
export function vigorStateOf(creature: CreatureState): VigorState {
  return {
    currentVigor: creature.attributes.energy,
    maxVigor: creature.maxVigor,
    vigorRecoveryRate: creature.vigorRecoveryRate,
    lastVigorCalculationAt: creature.lastVigorCalculationAt,
  };
}

/**
 * Recalcula o Vigor da criatura pelo tempo decorrido (recuperação passiva) e
 * mantém a taxa em dia com o atributo Recuperação. Persiste localmente apenas os
 * campos de Vigor (sem enfileirar sync — o servidor recalcula por conta própria).
 * Retorna a criatura já com o Vigor atualizado.
 */
export async function recalculateVigor(
  db: SqlDatabase,
  creature: CreatureState,
  now: string = nowIso(),
): Promise<CreatureState> {
  const rate = computeVigorRecoveryRate(creature.attributes.recovery);
  const recovery = recoverVigor({ ...vigorStateOf(creature), vigorRecoveryRate: rate }, now);

  const changed =
    recovery.currentVigor !== creature.attributes.energy ||
    recovery.lastVigorCalculationAt !== creature.lastVigorCalculationAt ||
    rate !== creature.vigorRecoveryRate;

  if (!changed) {
    return creature;
  }

  const next: CreatureState = {
    ...creature,
    attributes: { ...creature.attributes, energy: recovery.currentVigor },
    vigorRecoveryRate: rate,
    lastVigorCalculationAt: recovery.lastVigorCalculationAt,
  };

  await creatureRepository.updateVigor(db, creature.id, {
    currentVigor: recovery.currentVigor,
    maxVigor: next.maxVigor,
    vigorRecoveryRate: rate,
    lastVigorCalculationAt: recovery.lastVigorCalculationAt,
  });

  return next;
}
