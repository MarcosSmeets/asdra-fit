import type { BattleEvent } from '@ad-sidera/shared';
import { battleVisualFeedback, battleVisualFeedbackSequence } from './battleFeedback';

describe('feedback visual da batalha', () => {
  it('usa os mesmos valores de dano bruto, bloqueado e final calculados pelo motor', () => {
    const event: BattleEvent = {
      round: 2, side: 'enemy', kind: 'ability', abilityName: 'Golpe Ressonante',
      rawDamage: 20, blockedDamage: 14, damage: 6,
      text: 'Dano base 20. Guarda bloqueou 14. Dano final 6.',
    };
    expect(battleVisualFeedback([event], 4)).toEqual({
      seq: 4, attacker: 'enemy', damage: 6, rawDamage: 20, blockedDamage: 14,
    });
  });

  it('não inventa bloqueio quando a defesa não teve efeito', () => {
    const event: BattleEvent = { round: 1, side: 'player', kind: 'ability', damage: 12, text: '12 de dano.' };
    expect(battleVisualFeedback([event], 1)).toMatchObject({ damage: 12, rawDamage: 12, blockedDamage: 0 });
  });

  it('não produz feedback sem evento', () => {
    expect(battleVisualFeedback([], 0)).toBeUndefined();
  });
});

describe('battleVisualFeedbackSequence', () => {
  it('keeps player action and enemy response as two readable beats', () => {
    const sequence = battleVisualFeedbackSequence([
      { round: 1, side: 'player', kind: 'ability', damage: 10, text: 'Jogador atacou.' },
      { round: 1, side: 'enemy', kind: 'ability', damage: 6, rawDamage: 20,
        blockedDamage: 14, text: 'Guarda bloqueou.' },
    ], 20);
    expect(sequence.map((item) => item.attacker)).toEqual(['player', 'enemy']);
    expect(sequence[1]).toMatchObject({ damage: 6, rawDamage: 20, blockedDamage: 14 });
  });
});
