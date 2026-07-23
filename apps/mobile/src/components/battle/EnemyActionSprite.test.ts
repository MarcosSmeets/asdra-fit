import { enemyAtlasRow } from './enemySpriteCatalog';

describe('enemy sprite atlas', () => {
  it('maps common and boss frames without sharing a row', () => {
    expect(enemyAtlasRow('r1', false)).toBe(0);
    expect(enemyAtlasRow('r1', true)).toBe(1);
    expect(enemyAtlasRow('r3', true)).toBe(5);
  });
});
