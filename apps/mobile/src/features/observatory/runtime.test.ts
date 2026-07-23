import { isBlockingRuntimeState, runtimeForInteraction } from './runtime';

describe('máquina de estados do Observatório', () => {
  it('separa movimento, cuidado e sincronização', () => {
    expect(runtimeForInteraction('active-adari', 'adari', 'adari-1')).toEqual({
      type: 'petting',
      adariId: 'adari-1',
    });
    expect(runtimeForInteraction('feeding-table', 'feeding_table', 'adari-1')).toEqual({
      type: 'feeding',
      adariId: 'adari-1',
    });
  });

  it('somente o carregamento inicial de assets bloqueia a cena', () => {
    expect(isBlockingRuntimeState({ type: 'loadingAssets' })).toBe(true);
    expect(isBlockingRuntimeState({ type: 'walking', destination: { x: 1, y: 2 } })).toBe(false);
    expect(isBlockingRuntimeState({ type: 'errorRecoverable', errorCode: 'SYNC_OFFLINE' })).toBe(false);
  });
});
