import { computeWeeklyProgress } from './weekly';

describe('weekly', () => {
  it('calcula percentual e conclusão', () => {
    const r = computeWeeklyProgress(2, 4);
    expect(r.percentageDisplayed).toBe(0.5);
    expect(r.completed).toBe(false);
    expect(r.remaining).toBe(2);
  });

  it('permite percentual exibido acima de 100% mas limita o de ranking a 1', () => {
    const r = computeWeeklyProgress(8, 4);
    expect(r.percentageDisplayed).toBe(2);
    expect(r.percentageForRanking).toBe(1);
    expect(r.completed).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it('marca completa quando valid == target', () => {
    expect(computeWeeklyProgress(3, 3).completed).toBe(true);
  });

  it('rejeita meta < 1', () => {
    expect(() => computeWeeklyProgress(1, 0)).toThrow();
  });
});
