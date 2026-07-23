import { getCampaignState, nextAvailableAdversary, TOTAL_ADVERSARIES } from './campaign';

describe('campaign', () => {
  it('possui aproximadamente 15 adversários', () => {
    expect(TOTAL_ADVERSARIES).toBe(15);
  });

  it('sem progresso: só o primeiro adversário da região 1 está disponível', () => {
    const state = getCampaignState([]);
    const region1 = state[0];
    expect(region1?.unlocked).toBe(true);
    expect(region1?.adversaries[0]?.unlocked).toBe(true);
    expect(region1?.adversaries[1]?.unlocked).toBe(false);
    // Região 2 bloqueada até vencer o chefe da região 1.
    expect(state[1]?.unlocked).toBe(false);
  });

  it('vencer o chefe da região 1 desbloqueia a região 2', () => {
    const state = getCampaignState(['r1-1', 'r1-2', 'r1-3', 'r1-4', 'r1-boss']);
    expect(state[1]?.unlocked).toBe(true);
    expect(state[1]?.adversaries[0]?.unlocked).toBe(true);
  });

  it('nextAvailableAdversary avança pela campanha', () => {
    expect(nextAvailableAdversary([])?.id).toBe('r1-1');
    expect(nextAvailableAdversary(['r1-1'])?.id).toBe('r1-2');
  });
});
