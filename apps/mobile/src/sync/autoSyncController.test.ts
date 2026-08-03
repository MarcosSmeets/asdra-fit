import { connectionRestored, createAutoSyncController } from './autoSyncController';

describe('controlador de sincronização automática', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function build(overrides: Partial<Parameters<typeof createAutoSyncController>[0]> = {}) {
    const flush = jest.fn().mockResolvedValue({ pushed: 1, failed: 0, conflicts: 0 });
    const controller = createAutoSyncController({
      isAccountMode: () => true,
      pendingCount: jest.fn().mockResolvedValue(2),
      flush,
      debounceMs: 100,
      ...overrides,
    });
    return { controller, flush };
  }

  it('agrupa sinais repetidos em um único flush (debounce)', async () => {
    const { controller, flush } = build();
    controller.signal();
    controller.signal();
    controller.signal();
    await jest.advanceTimersByTimeAsync(150);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('não sincroniza fora do modo conta', async () => {
    const { controller, flush } = build({ isAccountMode: () => false });
    controller.signal();
    await jest.advanceTimersByTimeAsync(150);
    expect(flush).not.toHaveBeenCalled();
  });

  it('não chama o backend quando a fila está vazia', async () => {
    const { controller, flush } = build({ pendingCount: jest.fn().mockResolvedValue(0) });
    controller.signal();
    await jest.advanceTimersByTimeAsync(150);
    expect(flush).not.toHaveBeenCalled();
  });

  it('engole falha de rede e aceita nova tentativa depois', async () => {
    const flush = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ pushed: 2, failed: 0, conflicts: 0 });
    const { controller } = build({ flush });
    controller.signal();
    await jest.advanceTimersByTimeAsync(150);
    controller.signal();
    await jest.advanceTimersByTimeAsync(150);
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('ignora sinais após dispose', async () => {
    const { controller, flush } = build();
    controller.signal();
    controller.dispose();
    await jest.advanceTimersByTimeAsync(150);
    expect(flush).not.toHaveBeenCalled();
  });
});

describe('connectionRestored', () => {
  it('exige conexão e ausência de veredito negativo de alcance', () => {
    expect(connectionRestored({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(connectionRestored({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(connectionRestored({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(connectionRestored({ isConnected: false, isInternetReachable: null })).toBe(false);
    expect(connectionRestored({ isConnected: null, isInternetReachable: null })).toBe(false);
  });
});
