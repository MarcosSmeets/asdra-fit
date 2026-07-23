import { ADARI_ACTION_FRAME, safeAdariAtlasColumn } from './adariActionSpriteFrames';

describe('Adari action sprite frames', () => {
  it('uses distinct bitmap frames for affection, food and combat', () => {
    expect(ADARI_ACTION_FRAME.receivingAffection).toBe(2);
    expect(ADARI_ACTION_FRAME.eating).toBe(3);
    expect(ADARI_ACTION_FRAME.attacking).toBe(6);
  });

  it('never swaps Velune for the malformed recoil cell', () => {
    expect(safeAdariAtlasColumn('lumora', 7)).toBe(6);
    expect(safeAdariAtlasColumn('solivar', 7)).toBe(7);
  });
});
