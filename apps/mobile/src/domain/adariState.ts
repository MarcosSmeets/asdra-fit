import type { AdariMood } from '../components/adari/AdariPortrait';

export interface AdariStatusInput {
  name: string;
  evolutionAvailable: boolean;
  weekCompleted: boolean;
  /** Energia suficiente para uma batalha. */
  battleReady: boolean;
  /** Sem atividades há vários dias. */
  returning: boolean;
  /** Início de uma nova semana (progresso zerado). */
  newWeek: boolean;
}

export interface AdariStatus {
  mood: AdariMood;
  message: string;
}

/**
 * Deriva o estado visual e a mensagem contextual do Adari (função PURA).
 * Nunca culpabiliza; o Adari nunca adoece, morre nem perde nível.
 */
export function deriveAdariStatus(input: AdariStatusInput): AdariStatus {
  const { name } = input;
  if (input.evolutionAvailable) {
    return { mood: 'happy', message: `${name} está pronto para uma nova forma!` };
  }
  if (input.weekCompleted) {
    return { mood: 'happy', message: `${name} sentiu sua constância crescendo.` };
  }
  if (input.returning) {
    return { mood: 'normal', message: `${name} sentiu sua falta. Vamos retomar juntos?` };
  }
  if (input.newWeek) {
    return { mood: 'normal', message: `Uma nova semana começa. ${name} está a postos.` };
  }
  if (input.battleReady) {
    return { mood: 'ready', message: `${name} está pronto para um desafio.` };
  }
  return { mood: 'normal', message: `${name} está pronto para avançar.` };
}
