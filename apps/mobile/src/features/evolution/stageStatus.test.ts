import { stageStatusFor } from './stageStatus';

describe('stageStatusFor (Linha Evolutiva)', () => {
  it('marca passado, atual, próximo disponível e bloqueados', () => {
    expect(stageStatusFor(0, 1, true)).toBe('completed');
    expect(stageStatusFor(1, 1, true)).toBe('current');
    expect(stageStatusFor(2, 1, true)).toBe('available');
    expect(stageStatusFor(3, 1, true)).toBe('blocked');
  });

  it('próximo estágio sem requisitos cumpridos fica Bloqueado (nunca Disponível)', () => {
    expect(stageStatusFor(2, 1, false)).toBe('blocked');
  });

  it('estágios além do próximo nunca ficam Disponíveis (não pular)', () => {
    expect(stageStatusFor(3, 0, true)).toBe('blocked');
    expect(stageStatusFor(2, 0, true)).toBe('blocked');
  });

  it('na Perfeita todos os anteriores são Concluídos e nada fica Disponível', () => {
    expect(stageStatusFor(0, 3, false)).toBe('completed');
    expect(stageStatusFor(2, 3, false)).toBe('completed');
    expect(stageStatusFor(3, 3, false)).toBe('current');
  });
});
