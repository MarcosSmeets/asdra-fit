import { ADARI_SPRITE_SEQUENCES } from '../../components/adari/adariActionSpriteFrames';
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

  it('expõe reações distintas para conversa e descanso', () => {
    expect(visualStateForScreenState(reduceMyAdariState('ready', 'TALK'))).toBe('talkingReaction');
    expect(visualStateForScreenState(reduceMyAdariState('ready', 'REST'))).toBe('resting');
  });
});

describe('pose de repouso estática', () => {
  it('idle não faz loop nem troca de frame — só as ações animam', () => {
    expect(adariMotionFor('idle').loop).toBe(false);
    expect(ADARI_SPRITE_SEQUENCES.idle).toHaveLength(1);
  });

  it('estados contínuos usam pose ÚNICA: nada de alternar em pé/deitado', () => {
    for (const state of ['idle', 'resting', 'sleeping', 'tired', 'battleReady'] as const) {
      expect(ADARI_SPRITE_SEQUENCES[state]).toHaveLength(1);
    }
  });

  it('descanso e sono ficam na pose deitada (coluna 4), nunca na de pé', () => {
    for (const state of ['resting', 'sleeping', 'tired'] as const) {
      expect(ADARI_SPRITE_SEQUENCES[state]).toEqual([4]);
    }
  });

  it('estados contínuos seguem com movimento suave de cena (loop no animador)', () => {
    for (const state of ['resting', 'sleeping', 'battleReady'] as const) {
      expect(adariMotionFor(state).loop).toBe(true);
    }
  });
});

describe('estados novos do Build 5 (blink/breathing/evolving)', () => {
  it('blink é um micro-gesto rápido e sem loop', () => {
    const motion = adariMotionFor('blink');
    expect(motion.loop).toBe(false);
    expect(motion.actionMs).toBeLessThan(200);
  });

  it('breathing e evolving são loops de cena', () => {
    expect(adariMotionFor('breathing').loop).toBe(true);
    expect(adariMotionFor('evolving').loop).toBe(true);
  });

  it('todo estado novo tem contrato de sprite por linha', () => {
    for (const state of ['blink', 'breathing', 'evolving'] as const) {
      for (const creatureKey of ['terravok', 'lumora', 'solivar']) {
        expect(spriteAnimationFor(creatureKey, state).key).toBe(`${creatureKey}.${state}`);
      }
    }
  });
});
