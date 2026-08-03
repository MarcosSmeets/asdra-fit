import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CREATURES } from '@ad-sidera/shared';
import {
  ADARI_ASSET_MANIFESTS,
  ADARI_LINE_KEYS,
  ADARI_STAGE_SLUGS,
  DEFAULT_MANIFEST_KEY,
} from './manifests';

const ASSETS_DIR = join(__dirname, '..', '..', '..', 'assets');

describe('manifests de assets dos Adaris (§44)', () => {
  it('existe manifest para todo assetManifestKey declarado no conteúdo shared', () => {
    for (const creature of CREATURES) {
      for (const stage of creature.stages) {
        const manifest = ADARI_ASSET_MANIFESTS[stage.assetManifestKey];
        expect(manifest).toBeDefined();
        expect(manifest!.adariKey).toBe(creature.key);
        expect(ADARI_STAGE_SLUGS[manifest!.stageInt]).toBe(stage.assetManifestKey.split('/')[1]);
      }
    }
  });

  it('cobre exatamente 3 linhas × 4 estágios e inclui o manifest padrão', () => {
    expect(Object.keys(ADARI_ASSET_MANIFESTS)).toHaveLength(ADARI_LINE_KEYS.length * ADARI_STAGE_SLUGS.length);
    expect(ADARI_ASSET_MANIFESTS[DEFAULT_MANIFEST_KEY]).toBeDefined();
  });

  it('aplica as escalas por estágio da spec §22', () => {
    const expected = [
      { scaleHome: 0.7, scaleBattle: 0.7 },
      { scaleHome: 0.85, scaleBattle: 0.85 },
      { scaleHome: 1.0, scaleBattle: 1.0 },
      { scaleHome: 1.15, scaleBattle: 1.1 },
    ];
    for (const manifest of Object.values(ADARI_ASSET_MANIFESTS)) {
      expect(manifest.renderConfig.scaleHome).toBe(expected[manifest.stageInt]!.scaleHome);
      expect(manifest.renderConfig.scaleBattle).toBe(expected[manifest.stageInt]!.scaleBattle);
    }
  });

  it('tem renderConfig válido (anchor 0..1, sombra e atlas coerentes)', () => {
    for (const manifest of Object.values(ADARI_ASSET_MANIFESTS)) {
      const { anchor, shadow, hitboxInsetRatio } = manifest.renderConfig;
      expect(anchor.x).toBeGreaterThanOrEqual(0);
      expect(anchor.x).toBeLessThanOrEqual(1);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.y).toBeLessThanOrEqual(1);
      expect(shadow.widthRatio).toBeGreaterThan(0);
      expect(shadow.widthRatio).toBeLessThanOrEqual(1);
      expect(hitboxInsetRatio).toBeGreaterThanOrEqual(0);
      expect(hitboxInsetRatio).toBeLessThan(0.5);
      expect(manifest.atlas.columns).toBe(8);
      expect(manifest.atlas.row).toBeLessThan(manifest.atlas.rows);
      expect(manifest.atlas.cellSize).toBeGreaterThan(0);
      expect(manifest.atlas.aspectRatio).toBeCloseTo(manifest.atlas.columns / manifest.atlas.rows);
      expect(manifest.atlas.source).toBeTruthy();
      expect(manifest.portrait).toBeTruthy();
      expect(manifest.silhouette).toBeTruthy();
    }
  });

  it('só o atlas legado v2 (BASE) usa a correção de coluna defeituosa', () => {
    for (const manifest of Object.values(ADARI_ASSET_MANIFESTS)) {
      expect(manifest.atlas.applyLegacyColumnSafety).toBe(manifest.stageInt === 0);
    }
  });

  it('os PNGs gerados existem em disco com variantes @1x/@2x/@3x', () => {
    expect(existsSync(join(ASSETS_DIR, 'adaris', 'sheets', 'adari-action-atlas-v2.png'))).toBe(true);
    for (const line of ADARI_LINE_KEYS) {
      ADARI_STAGE_SLUGS.forEach((slug, stageInt) => {
        const dir = join(ASSETS_DIR, 'pixel-art', 'adaris', line, slug);
        const version = stageInt === 0 ? 'v1' : 'v2';
        const files = [`portrait-${version}`, `silhouette-${version}`, ...(stageInt > 0 ? ['home-actions-v2'] : [])];
        for (const file of files) {
          for (const suffix of ['', '@2x', '@3x']) {
            expect(existsSync(join(dir, `${file}${suffix}.png`))).toBe(true);
          }
        }
      });
    }
  });

  // O acesso ao mapa GENERATED usava `as keyof typeof`, então uma chave sem
  // `require` correspondente fazia o módulo LANÇAR durante o import — derrubando
  // tudo que depende de content/adari, e não só o sprite afetado. Este teste passa
  // a falhar na suíte em vez de o app morrer no boot.
  it('toda combinação de linha e estágio produz um manifest completo', () => {
    for (const line of ADARI_LINE_KEYS) {
      for (const slug of ADARI_STAGE_SLUGS) {
        const manifest = ADARI_ASSET_MANIFESTS[`${line}/${slug}`];
        expect(manifest).toBeDefined();
        expect(manifest!.atlas.source).toBeDefined();
        expect(manifest!.portrait).toBeDefined();
        expect(manifest!.silhouette).toBeDefined();
        expect(manifest!.renderConfig.shadow).toBeDefined();
      }
    }
  });

  it('os tiles da Jornada existem por região', () => {
    for (const region of ['r1', 'r2', 'r3']) {
      for (const tile of ['tile-ground-v1', 'tile-path-v1', 'portal-v1']) {
        expect(existsSync(join(ASSETS_DIR, 'pixel-art', 'journey', region, `${tile}.png`))).toBe(true);
      }
    }
  });
});
