import type { BattleEvent } from '@ad-sidera/shared';

export interface BattleVisualFeedback {
  seq: number;
  attacker: 'player' | 'enemy';
  damage: number;
  rawDamage: number;
  blockedDamage: number;
}

/** MantÃ©m nÃºmero flutuante, escudo e histÃ³rico derivados do mesmo evento do motor. */
export function battleVisualFeedback(
  events: readonly BattleEvent[],
  seq: number,
): BattleVisualFeedback | undefined {
  const event = [...events].reverse().find((item) => (item.damage ?? 0) > 0) ?? events.at(-1);
  if (!event) return undefined;
  const damage = Math.max(0, event.damage ?? 0);
  const rawDamage = Math.max(damage, event.rawDamage ?? damage);
  const blockedDamage = Math.max(0, event.blockedDamage ?? rawDamage - damage);
  return { seq, attacker: event.side, damage, rawDamage, blockedDamage };
}

/** Um round pode conter a aÃ§Ã£o do jogador e a resposta inimiga. */
export function battleVisualFeedbackSequence(
  events: readonly BattleEvent[],
  sequenceBase: number,
): BattleVisualFeedback[] {
  return events.filter((event) => (event.damage ?? 0) > 0).map((event, index) => {
    const damage = Math.max(0, event.damage ?? 0);
    const rawDamage = Math.max(damage, event.rawDamage ?? damage);
    return {
      seq: sequenceBase + index + 1,
      attacker: event.side,
      damage,
      rawDamage,
      blockedDamage: Math.max(0, event.blockedDamage ?? rawDamage - damage),
    };
  });
}
