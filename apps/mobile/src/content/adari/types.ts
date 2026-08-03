import type { ImageSourcePropType } from 'react-native';
import type { AdariVisualState } from '../../features/my-adari/state';

/**
 * Contratos de asset por (linha, estágio) — spec §22-23. O renderizador só
 * conhece manifests; a origem (atlas legado v2, placeholder gerado ou arte
 * final 32-bit) é detalhe de conteúdo. No futuro procedural (§36), o resolver
 * passa a aceitar um genoma e devolve o MESMO contrato.
 */

/** Como desenhar o estágio em cena (escala/anchor NUNCA compartilhados). */
export interface AdariStageRenderConfig {
  /** Escala relativa na home Meu Adari (§22: 0.70/0.85/1.00/1.15). */
  scaleHome: number;
  /** Escala relativa na batalha (§22: 0.70/0.85/1.00/1.10). */
  scaleBattle: number;
  /** Ponto de apoio do sprite (0..1 na célula). */
  anchor: { x: number; y: number };
  /** Sombra de contato dura, relativa ao tamanho renderizado. */
  shadow: { widthRatio: number; heightRatio: number; offsetY: number };
  /** Deslocamento fino em px lógicos ao posicionar na cena. */
  offset: { x: number; y: number };
  /** Margem interna da área de toque/colisão (0..0.5 da célula). */
  hitboxInsetRatio: number;
}

/** Atlas de ações do estágio (grade de poses consumida pelo AtlasFrame). */
export interface AdariAtlasConfig {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  /** Linha da grade usada por este manifest (atlas v2 agrupa as 3 linhas). */
  row: number;
  /** Resolução lógica da célula (px de arte, antes do pré-escalonamento). */
  cellSize: number;
  /** columns/rows — repassado direto ao AtlasFrame. */
  aspectRatio: number;
  /** Atlas legado v2: aplica safeAdariAtlasColumn (célula defeituosa). */
  applyLegacyColumnSafety: boolean;
}

export interface AdariAssetManifest {
  /** `<linha>/<estágio-kebab>` — igual ao assetManifestKey do shared. */
  key: string;
  adariKey: string;
  /** Estágio persistido (0..3). */
  stageInt: number;
  atlas: AdariAtlasConfig;
  portrait: ImageSourcePropType;
  /** Silhueta escura para estágios bloqueados na Linha Evolutiva. */
  silhouette: ImageSourcePropType;
  renderConfig: AdariStageRenderConfig;
  /**
   * Estados visuais que o atlas cobre. Ausente = todos. Estados fora da lista
   * caem na cadeia de fallback do resolver — a cena NUNCA bloqueia por asset.
   */
  supportedStates?: readonly AdariVisualState[];
  version: number;
}
