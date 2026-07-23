import { selectAdariDialogue } from '../domain/adariDialogue';

const base = {
  creatureKey: 'terravok', bond: 20, vigor: 80, maxVigor: 100, satiety: 70,
  weeklyRemaining: 3, hour: 14, state: 'idle' as const,
};

describe('AdariDialogueService', () => {
  it('prioriza uma atividade recente sem culpabilizar', () => {
    const now = new Date('2026-07-22T15:00:00.000Z');
    expect(selectAdariDialogue({ ...base, lastActivityAt: '2026-07-22T14:00:00.000Z' }, now))
      .toContain('força crescendo');
  });

  it('explica Vigor baixo e meta próxima', () => {
    expect(selectAdariDialogue({ ...base, vigor: 10 })).toContain('descansando');
    expect(selectAdariDialogue({ ...base, weeklyRemaining: 1 })).toContain('mais um dia');
  });

  it('mantém personalidade centralizada por Adari', () => {
    expect(selectAdariDialogue({ ...base, creatureKey: 'lumora' })).not.toBe(
      selectAdariDialogue({ ...base, creatureKey: 'solivar' }),
    );
  });
});
