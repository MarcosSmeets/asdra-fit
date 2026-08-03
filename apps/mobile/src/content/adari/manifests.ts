import type { AdariAssetManifest, AdariAtlasConfig, AdariStageRenderConfig } from './types';

/**
 * Manifests dos 12 estágios (3 linhas × 4 estágios). BASE continua no atlas v2
 * (arte existente, 1 linha da grade por Adari); EV 1/EV 2/PERFECT usam os
 * placeholders gerados por tools/pixel-art/generate-placeholders.mjs até a
 * arte final chegar (ver docs/PIXEL_ART_ASSET_BACKLOG.md).
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const ATLAS_V2 = require('../../../assets/adaris/sheets/adari-action-atlas-v2.png');

const GENERATED = {
  'terravok/base': {
    portrait: require('../../../assets/pixel-art/adaris/terravok/base/portrait-v1.png'),
    silhouette: require('../../../assets/pixel-art/adaris/terravok/base/silhouette-v1.png'),
  },
  'terravok/evolution-1': {
    atlas: require('../../../assets/pixel-art/adaris/terravok/evolution-1/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/terravok/evolution-1/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/terravok/evolution-1/silhouette-v2.png'),
  },
  'terravok/evolution-2': {
    atlas: require('../../../assets/pixel-art/adaris/terravok/evolution-2/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/terravok/evolution-2/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/terravok/evolution-2/silhouette-v2.png'),
  },
  'terravok/perfect': {
    atlas: require('../../../assets/pixel-art/adaris/terravok/perfect/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/terravok/perfect/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/terravok/perfect/silhouette-v2.png'),
  },
  'lumora/base': {
    portrait: require('../../../assets/pixel-art/adaris/lumora/base/portrait-v1.png'),
    silhouette: require('../../../assets/pixel-art/adaris/lumora/base/silhouette-v1.png'),
  },
  'lumora/evolution-1': {
    atlas: require('../../../assets/pixel-art/adaris/lumora/evolution-1/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/lumora/evolution-1/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/lumora/evolution-1/silhouette-v2.png'),
  },
  'lumora/evolution-2': {
    atlas: require('../../../assets/pixel-art/adaris/lumora/evolution-2/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/lumora/evolution-2/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/lumora/evolution-2/silhouette-v2.png'),
  },
  'lumora/perfect': {
    atlas: require('../../../assets/pixel-art/adaris/lumora/perfect/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/lumora/perfect/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/lumora/perfect/silhouette-v2.png'),
  },
  'solivar/base': {
    portrait: require('../../../assets/pixel-art/adaris/solivar/base/portrait-v1.png'),
    silhouette: require('../../../assets/pixel-art/adaris/solivar/base/silhouette-v1.png'),
  },
  'solivar/evolution-1': {
    atlas: require('../../../assets/pixel-art/adaris/solivar/evolution-1/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/solivar/evolution-1/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/solivar/evolution-1/silhouette-v2.png'),
  },
  'solivar/evolution-2': {
    atlas: require('../../../assets/pixel-art/adaris/solivar/evolution-2/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/solivar/evolution-2/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/solivar/evolution-2/silhouette-v2.png'),
  },
  'solivar/perfect': {
    atlas: require('../../../assets/pixel-art/adaris/solivar/perfect/home-actions-v2.png'),
    portrait: require('../../../assets/pixel-art/adaris/solivar/perfect/portrait-v2.png'),
    silhouette: require('../../../assets/pixel-art/adaris/solivar/perfect/silhouette-v2.png'),
  },
} as const;
/* eslint-enable @typescript-eslint/no-var-requires */

export const ADARI_LINE_KEYS = ['terravok', 'lumora', 'solivar'] as const;
export const ADARI_STAGE_SLUGS = ['base', 'evolution-1', 'evolution-2', 'perfect'] as const;

/** Linha da grade do atlas v2 por Adari (arte existente do Build 4). */
const V2_ROW: Record<string, number> = { terravok: 0, lumora: 1, solivar: 2 };

/** Escala/anchor por estágio (§22). Cada estágio tem o próprio anchor. */
const STAGE_RENDER: readonly Pick<AdariStageRenderConfig, 'scaleHome' | 'scaleBattle' | 'anchor'>[] = [
  { scaleHome: 0.7, scaleBattle: 0.7, anchor: { x: 0.5, y: 0.94 } },
  { scaleHome: 0.85, scaleBattle: 0.85, anchor: { x: 0.5, y: 0.94 } },
  { scaleHome: 1.0, scaleBattle: 1.0, anchor: { x: 0.5, y: 0.95 } },
  { scaleHome: 1.15, scaleBattle: 1.1, anchor: { x: 0.5, y: 0.96 } },
];

/** Sombra de contato por linha (Brontu largo, Velune esguio, Myrin médio). */
const LINE_SHADOW: Record<string, AdariStageRenderConfig['shadow']> = {
  terravok: { widthRatio: 0.78, heightRatio: 0.14, offsetY: 2 },
  lumora: { widthRatio: 0.52, heightRatio: 0.12, offsetY: 2 },
  solivar: { widthRatio: 0.62, heightRatio: 0.12, offsetY: 2 },
};

interface GeneratedEntry {
  atlas?: number;
  portrait: number;
  silhouette: number;
}

/**
 * Lookup tolerante. O acesso direto com `as keyof typeof GENERATED` mentia para o
 * compilador: bastava uma chave em ADARI_LINE_KEYS/ADARI_STAGE_SLUGS sem `require`
 * correspondente para `'atlas' in undefined` lançar TypeError DURANTE a avaliação
 * do módulo — e como content/adari é importado pela home, pelo renderer e pelos
 * sprites, isso derrubava o app inteiro em vez de degradar um sprite.
 */
const GENERATED_MAP = GENERATED as unknown as Record<string, GeneratedEntry | undefined>;

function generatedFor(line: string, slug: string): GeneratedEntry | undefined {
  return GENERATED_MAP[`${line}/${slug}`];
}

function atlasFor(line: string, slug: string): AdariAtlasConfig {
  const generated = generatedFor(line, slug);
  if (slug !== 'base' && generated?.atlas !== undefined) {
    return {
      source: generated.atlas,
      columns: 8,
      rows: 1,
      row: 0,
      cellSize: 64,
      aspectRatio: 8,
      applyLegacyColumnSafety: false,
    };
  }
  return {
    source: ATLAS_V2,
    columns: 8,
    rows: 3,
    row: V2_ROW[line] ?? 2,
    cellSize: 256,
    aspectRatio: 8 / 3,
    applyLegacyColumnSafety: true,
  };
}

function buildManifest(line: string, stageInt: number): AdariAssetManifest {
  const slug = ADARI_STAGE_SLUGS[stageInt] ?? 'base';
  const generated = generatedFor(line, slug);
  if (!generated && __DEV__) {
    console.warn(`[adari] sem assets gerados para ${line}/${slug}; usando fallback`);
  }
  // Degrada em cascata: estágio pedido → base da mesma linha → solivar/base →
  // o atlas v2, que é um require garantido. Nunca undefined, nunca lança.
  const art = generated ?? generatedFor(line, 'base') ?? generatedFor('solivar', 'base');
  const stage = STAGE_RENDER[stageInt] ?? STAGE_RENDER[0]!;
  return {
    key: `${line}/${slug}`,
    adariKey: line,
    stageInt,
    atlas: atlasFor(line, slug),
    portrait: art?.portrait ?? ATLAS_V2,
    silhouette: art?.silhouette ?? ATLAS_V2,
    renderConfig: {
      scaleHome: stage.scaleHome,
      scaleBattle: stage.scaleBattle,
      anchor: { ...stage.anchor },
      shadow: { ...(LINE_SHADOW[line] ?? LINE_SHADOW.solivar!) },
      offset: { x: 0, y: 0 },
      hitboxInsetRatio: 0.08,
    },
    version: stageInt === 0 ? 1 : 2,
  };
}

export const ADARI_ASSET_MANIFESTS: Readonly<Record<string, AdariAssetManifest>> =
  Object.fromEntries(
    ADARI_LINE_KEYS.flatMap((line) =>
      ADARI_STAGE_SLUGS.map((_, stageInt) => {
        const manifest = buildManifest(line, stageInt);
        return [manifest.key, manifest];
      }),
    ),
  );

/** Fallback final do resolver (nunca deixar a cena sem Adari). */
export const DEFAULT_MANIFEST_KEY = 'solivar/base';
