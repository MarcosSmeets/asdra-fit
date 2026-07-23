import { getAdariBehaviorProfile } from '@ad-sidera/shared';
import type { AdariVisualState } from '../features/my-adari/state';

export interface AdariDialogueInput {
  creatureKey: string;
  bond: number;
  vigor: number;
  maxVigor: number;
  satiety: number;
  weeklyRemaining?: number;
  hour: number;
  state: AdariVisualState;
  returning?: boolean;
  lastActivityAt?: string | null;
  lastBattleResult?: 'victory' | 'defeat' | null;
}

const PERSONALITY_LINES: Readonly<Record<string, readonly string[]>> = {
  terravok: ['Estou aqui. Vamos seguir juntos.', 'Cada passo firme deixa nossa história mais forte.'],
  lumora: ['Há algo novo nas estrelas hoje.', 'Um ritmo tranquilo também nos leva longe.'],
  solivar: ['Encontrei um caminho que ainda não exploramos.', 'Talvez o próximo lampejo esteja bem perto.'],
};

function happenedRecently(value: string | null | undefined, now: Date, hours: number): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && now.getTime() - parsed >= 0 && now.getTime() - parsed <= hours * 3_600_000;
}

export function selectAdariDialogue(input: AdariDialogueInput, now = new Date()): string {
  const profile = getAdariBehaviorProfile(input.creatureKey);
  if (input.returning) return 'Não precisamos recuperar o tempo perdido. Vamos continuar daqui.';
  if (input.state === 'excitedAfterActivity' || happenedRecently(input.lastActivityAt, now, 3)) {
    return 'Senti nossa força crescendo depois daquela atividade.';
  }
  if (input.lastBattleResult === 'defeat') return 'Já entendemos um pouco mais daquele desafio. Podemos tentar outra estratégia.';
  if (input.lastBattleResult === 'victory') return 'Nossa última vitória ainda brilha por aqui.';
  if (input.vigor < Math.max(15, input.maxVigor * 0.2)) return 'Estou descansando para nossa próxima batalha.';
  if (input.weeklyRemaining === 1) return 'Falta apenas mais um dia para concluirmos nossa meta.';
  if (input.satiety < 25) return 'Um Fruto Astral cairia muito bem agora.';
  if (input.hour >= 22 || input.hour < 6) return 'As estrelas estão quietas. Podemos descansar um pouco.';
  if (input.hour < 12) return 'Que bom começar este momento com você.';
  if (input.bond >= 80) return 'Nossa história já brilha entre as constelações.';
  const lines = PERSONALITY_LINES[input.creatureKey] ?? [profile.greeting];
  return lines[(input.hour + Math.floor(input.bond / 20)) % lines.length] ?? profile.greeting;
}
