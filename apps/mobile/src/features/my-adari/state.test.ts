import { adariMotionFor, spriteAnimationFor } from './animationCatalog';
import { reduceMyAdariState, visualStateForScreenState } from './state';

describe('máquina da tela Meu Adari', () => {
  it('libera a tela após carregar somente os assets essenciais', () => {
    expect(reduceMyAdariState('loadingEssentialAssets', 'ASSETS_READY')).toBe('ready');
  });

  it('inicia carinho imediatamente e impede outra ação até concluir', () => {
    const petting = reduceMyAdariState('ready', 'PET');
    expect(petting).toBe('petting');
    expect(visualStateForScreenState(petting)).toBe('receivingAffection');
    expect(reduceMyAdariState(petting, 'FEED')).toBe('petting');
    expect(reduceMyAdariState(petting, 'COMPLETE')).toBe('ready');
  });

  it('possui fallback de contrato para chave de Adari desconhecida', () => {
    expect(spriteAnimationFor('futuro', 'idle').key).toBe('solivar.idle');
    expect(adariMotionFor('attacking').loop).toBe(false);
  });

  it('expÃµe reaÃ§Ãµes distintas para conversa e descanso', () => {
    expect(visualStateForScreenState(reduceMyAdariState('ready', 'TALK'))).toBe('talkingReaction');
    expect(visualStateForScreenState(reduceMyAdariState('ready', 'REST'))).toBe('resting');
  });
});
