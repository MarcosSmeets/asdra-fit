import { BATTLE_VIGOR_COST, spendVigor, type Combatant } from '@ad-sidera/shared';
import { apiRequest } from '../api/client';
import { getDatabase } from '../db/database';
import type { CreatureState } from '../db/models';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { nowIso } from '../utils/datetime';
import { getCreature } from './creatureService';
import { enqueueOperation } from './outbox';
import { creatureSyncPayload } from './syncPayloads';

export interface DuelOpponent {
  userId: string;
  displayName: string;
  avatarType: string;
  creatureKey: string;
  creatureLevel: number | null;
}

export type DuelWinner = 'challenger' | 'opponent' | 'draw';

export interface DuelResult {
  id: string;
  seed: number;
  winner: DuelWinner;
  rounds: number;
  challengerHealth: number;
  opponentHealth: number;
  vigorSpent: number;
  challenger: Combatant;
  opponent: Combatant;
  opponentName: string;
}

export interface DuelSummary {
  id: string;
  role: 'challenger' | 'opponent';
  opponentUserId: string;
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  rounds: number;
  seed: number;
  createdAt: string;
}

/** Membros da mesma liga disponíveis para duelo (exigem conexão). */
export function getDuelOpponents(): Promise<DuelOpponent[]> {
  return apiRequest<DuelOpponent[]>('/duels/opponents');
}

/** Histórico de duelos (exige conexão). */
export function getDuelHistory(): Promise<DuelSummary[]> {
  return apiRequest<DuelSummary[]>('/duels');
}

export interface ChallengeOutcome {
  result: DuelResult;
  creature: CreatureState;
}

/**
 * Desafia um membro da liga. O RESULTADO é resolvido no servidor (autoritativo,
 * determinístico). O Vigor (só do desafiante) é debitado LOCALMENTE após o sucesso —
 * mantendo o Vigor client-authoritative sem duplicar. Requer conexão.
 */
export async function challengeDuel(opponentUserId: string): Promise<ChallengeOutcome> {
  const db = await getDatabase();
  const creature = await getCreature();
  if (!creature) {
    throw new Error('Seu Adari ainda não está pronto.');
  }
  const cost = BATTLE_VIGOR_COST.friendlyDuel;
  if (creature.attributes.energy < cost) {
    throw new Error('Vigor insuficiente para um duelo. Descanse um pouco e volte.');
  }

  // Servidor resolve o duelo (falha aqui = nenhum Vigor gasto).
  const result = await apiRequest<DuelResult>('/duels', {
    method: 'POST',
    body: { opponentUserId },
  });

  // Débito local do Vigor (desafiante) + sync.
  const now = nowIso();
  const updated: CreatureState = {
    ...creature,
    attributes: { ...creature.attributes, energy: spendVigor(creature.attributes.energy, cost) },
    updatedAt: now,
    syncStatus: 'pending',
  };
  await creatureRepository.update(db, updated);
  await enqueueOperation(db, {
    entityType: 'user_creature',
    entityId: updated.id,
    operationType: 'upsert',
    updatedAt: now,
    payload: creatureSyncPayload(updated),
  });

  return { result, creature: updated };
}
