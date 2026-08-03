import { ADARI_ASSET_MANIFESTS, DEFAULT_MANIFEST_KEY } from './manifests';
import { resolveAdariManifest, resolveStageSize, resolveVisualState } from './resolver';
import { ADARI_SPRITE_SEQUENCES } from '../../components/adari/adariActionSpriteFrames';
import type { AdariAssetManifest } from './types';
import type { AdariVisualState } from '../../features/my-adari/state';

describe('resolveAdariManifest', () => {
  it('resolve o estágio exato', () => {
    expect(resolveAdariManifest('terravok', 0).key).toBe('terravok/base');
    expect(resolveAdariManifest('lumora', 2).key).toBe('lumora/evolution-2');
    expect(resolveAdariManifest('solivar', 3).key).toBe('solivar/perfect');
  });

  it('clampa estágios fora da faixa persistida (0..3)', () => {
    expect(resolveAdariManifest('terravok', 99).key).toBe('terravok/perfect');
    expect(resolveAdariManifest('terravok', -5).key).toBe('terravok/base');
    expect(resolveAdariManifest('terravok', Number.NaN).key).toBe('terravok/base');
  });

  it('linha desconhecida cai no manifest padrão (nunca bloqueia a cena)', () => {
    expect(resolveAdariManifest('inexistente', 2).key).toBe(DEFAULT_MANIFEST_KEY);
  });
});

describe('resolveVisualState (cadeia de fallback §21)', () => {
  const full = ADARI_ASSET_MANIFESTS['terravok/evolution-1']!;

  function limited(states: readonly AdariVisualState[]): AdariAssetManifest {
    return { ...full, supportedStates: states };
  }

  it('mantém o estado quando o atlas cobre tudo', () => {
    expect(resolveVisualState(full, 'receivingAffection')).toBe('receivingAffection');
    expect(resolveVisualState(full, 'defeat')).toBe('defeat');
  });

  it('cai um degrau por vez: receivingAffection → happy → idle', () => {
    expect(resolveVisualState(limited(['idle', 'happy']), 'receivingAffection')).toBe('happy');
    expect(resolveVisualState(limited(['idle']), 'receivingAffection')).toBe('idle');
  });

  it('estados de batalha caem para battleReady antes de idle', () => {
    expect(resolveVisualState(limited(['idle', 'battleReady']), 'takingDamage')).toBe('battleReady');
    expect(resolveVisualState(limited(['idle', 'battleReady']), 'defeat')).toBe('battleReady');
  });

  it('nunca lança nem devolve estado sem suporte', () => {
    expect(resolveVisualState(limited([]), 'attacking')).toBe('idle');
  });

  it('estados novos do Build 5 caem em parentes visuais: blink/breathing → idle, evolving → happy', () => {
    expect(resolveVisualState(limited(['idle']), 'blink')).toBe('idle');
    expect(resolveVisualState(limited(['idle']), 'breathing')).toBe('idle');
    expect(resolveVisualState(limited(['idle', 'happy']), 'evolving')).toBe('happy');
    expect(resolveVisualState(full, 'evolving')).toBe('evolving');
  });
});

describe('resolveStageSize (§22)', () => {
  it('aplica a escala do contexto sobre o tamanho base', () => {
    const perfect = ADARI_ASSET_MANIFESTS['terravok/perfect']!;
    expect(resolveStageSize(perfect, 'home', 200)).toBe(230);
    expect(resolveStageSize(perfect, 'battle', 200)).toBe(220);
    const base = ADARI_ASSET_MANIFESTS['terravok/base']!;
    expect(resolveStageSize(base, 'home', 200)).toBe(140);
  });

  it('a presença em batalha cresce a cada estágio (sprite por estágio)', () => {
    for (const line of ['terravok', 'lumora', 'solivar']) {
      const sizes = [0, 1, 2, 3].map((stage) =>
        resolveStageSize(resolveAdariManifest(line, stage), 'battle', 156));
      for (let i = 1; i < sizes.length; i += 1) {
        expect(sizes[i]!).toBeGreaterThan(sizes[i - 1]!);
      }
    }
  });
});

describe('sequências de sprite vs. atlas', () => {
  it('toda sequência referencia colunas existentes (0..7)', () => {
    for (const sequence of Object.values(ADARI_SPRITE_SEQUENCES)) {
      expect(sequence.length).toBeGreaterThan(0);
      for (const column of sequence) {
        expect(column).toBeGreaterThanOrEqual(0);
        expect(column).toBeLessThan(8);
      }
    }
  });
});
