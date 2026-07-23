import { beginBattleAction, isBattleCommandLocked, phaseAfterAction } from './actionSequence';

describe('máquina visual da ação', () => {
  it('bloqueia um segundo comando enquanto a sequência está ativa', () => {
    expect(beginBattleAction('idle')).toBe('preparing');
    expect(beginBattleAction('attacking')).toBe('attacking');
    expect(isBattleCommandLocked('targetReaction')).toBe(true);
  });

  it('termina de acordo com o resultado lógico mesmo quando a animação é pulada', () => {
    expect(phaseAfterAction('ongoing')).toBe('idle');
    expect(phaseAfterAction('victory')).toBe('victory');
    expect(phaseAfterAction('defeat')).toBe('defeat');
  });
});

