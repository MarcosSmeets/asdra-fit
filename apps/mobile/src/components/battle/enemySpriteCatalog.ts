export function enemyAtlasRow(regionKey: string, isBoss: boolean): number {
  const region = regionKey === 'r2' ? 1 : regionKey === 'r3' ? 2 : 0;
  return region * 2 + (isBoss ? 1 : 0);
}
