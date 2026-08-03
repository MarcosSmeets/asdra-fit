import type { AttributeKey } from './types';
import type { AdariEvolutionStage } from './evolution';

/**
 * Preparação para Adaris procedurais (spec §36-37) — SOMENTE contratos.
 * Nenhum genoma é gerado no Build 5; nenhuma tela consome estes tipos ainda.
 * O ponto de entrada futuro é o AdariAssetResolver do mobile: hoje ele recebe
 * (linha, estágio) e devolve um manifest; amanhã receberá um AdariGenome e
 * devolverá o MESMO contrato de manifest, sem tocar nos renderizadores.
 * Detalhes em docs/FUTURE_PROCEDURAL_ADARIS.md.
 */

/** Semente determinística: mesmo genoma → mesma aparência, em qualquer device. */
export interface AdariGenome {
  /** Versão do formato do genoma (migrações futuras). */
  version: number;
  /** Semente inteira que determina TODA a variação visual. */
  seed: number;
  /** Linha base da qual a morfologia deriva (terravok/lumora/solivar). */
  baseLineKey: string;
  /** Estágio corrente — a morfologia é resolvida por estágio, como hoje. */
  stage: AdariEvolutionStage;
  /** Afinidade de atributo herdada da linha (influencia paleta/acessórios). */
  affinity: AttributeKey;
  /** Genes discretos (0..1) que os geradores mapeiam para variações visuais. */
  traits: AdariGenomeTraits;
}

/** Cada gene é uma fração estável; o gerador decide o que ela significa. */
export interface AdariGenomeTraits {
  /** Robustez da silhueta (esguio ↔ robusto). */
  build: number;
  /** Quantidade/escala de placas, marcas ou brasas. */
  ornamentDensity: number;
  /** Deslocamento de matiz dentro da paleta oficial da linha. */
  hueShift: number;
  /** Intensidade da aura/энergia visível. */
  auraIntensity: number;
}

/**
 * Morfologia resolvida a partir do genoma: o "esqueleto lógico" que um gerador
 * de sprites (offline ou em build) consome para produzir os mesmos atlases que
 * a arte manual produz hoje. As chaves espelham o AdariAssetManifest do mobile.
 */
export interface AdariMorphology {
  /** Genoma de origem (rastreabilidade). */
  genome: AdariGenome;
  /** Chave de manifest que o resolver deve publicar (`<linha>/<estágio>`). */
  assetManifestKey: string;
  /** Célula lógica dos atlases gerados (px de arte, pré-escala). */
  cellSize: number;
  /** Poses obrigatórias, na ordem de colunas do atlas de ações. */
  requiredPoses: readonly string[];
  /** Escalas de cena por contexto (espelha AdariStageRenderConfig). */
  render: {
    scaleHome: number;
    scaleBattle: number;
    anchor: { x: number; y: number };
  };
}

/** Poses mínimas que qualquer gerador precisa cobrir (colunas 0..7 do atlas). */
export const ADARI_MORPHOLOGY_REQUIRED_POSES: readonly string[] = [
  'idle', 'idle-alt', 'affection', 'eating', 'resting', 'ready', 'attacking', 'damage',
];
