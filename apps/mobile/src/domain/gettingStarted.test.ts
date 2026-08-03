import { GETTING_STARTED_STEPS, isGettingStartedReplay } from './gettingStarted';

describe('tutorial de primeiros passos', () => {
  it('mantém a explicação curta e na ordem do loop principal', () => {
    expect(GETTING_STARTED_STEPS.map((step) => step.key)).toEqual([
      'train',
      'progress',
      'care',
      'evolve',
    ]);
  });

  it('só considera replay quando o parâmetro é explícito', () => {
    expect(isGettingStartedReplay('1')).toBe(true);
    expect(isGettingStartedReplay('true')).toBe(true);
    expect(isGettingStartedReplay(undefined)).toBe(false);
    expect(isGettingStartedReplay(['1'])).toBe(false);
  });
});
