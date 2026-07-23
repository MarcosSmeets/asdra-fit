import { stableBattleSeed } from './battle';

describe('seed de batalha', () => {
  it('permanece igual nas retentativas contra o mesmo inimigo', () => {
    expect(stableBattleSeed('r1-boss', 'adari-1')).toBe(stableBattleSeed('r1-boss', 'adari-1'));
    expect(stableBattleSeed('r1-boss', 'adari-1')).not.toBe(stableBattleSeed('r1-1', 'adari-1'));
  });
});
