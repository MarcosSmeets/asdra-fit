import type { AdariVisualState } from '../../features/my-adari/state';
import {
  ADARI_ASSET_MANIFESTS,
  ADARI_STAGE_SLUGS,
  DEFAULT_MANIFEST_KEY,
} from './manifests';
import type { AdariAssetManifest } from './types';

/**
 * Ponto ÚNICO de resolução de assets de Adari (spec §23/§36). Hoje recebe
 * (linha, estágio) e devolve o manifest; no futuro procedural este é o lugar
 * que passa a aceitar um AdariGenome e montar o mesmo contrato. Regra de ouro:
 * NUNCA bloquear a cena por asset ausente — sempre devolve algo renderizável.
 */

declare const __DEV__: boolean | undefined;

const warned = new Set<string>();
function devWarn(message: string): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || warned.has(message)) return;
  warned.add(message);
  // eslint-disable-next-line no-console
  console.warn(`[adari-assets] ${message}`);
}

function clampStage(stageInt: number): number {
  if (!Number.isFinite(stageInt)) return 0;
  return Math.max(0, Math.min(ADARI_STAGE_SLUGS.length - 1, Math.trunc(stageInt)));
}

/**
 * Manifest do estágio pedido; cadeia de fallback: estágio exato → estágios
 * anteriores da mesma linha → manifest padrão.
 */
export function resolveAdariManifest(creatureKey: string, stageInt: number): AdariAssetManifest {
  const clamped = clampStage(stageInt);
  for (let stage = clamped; stage >= 0; stage -= 1) {
    const manifest = ADARI_ASSET_MANIFESTS[`${creatureKey}/${ADARI_STAGE_SLUGS[stage]}`];
    if (manifest) {
      if (stage !== clamped) devWarn(`manifest ausente: ${creatureKey}/${ADARI_STAGE_SLUGS[clamped]}; usando estágio ${stage}`);
      return manifest;
    }
  }
  devWarn(`linha desconhecida: ${creatureKey}; usando ${DEFAULT_MANIFEST_KEY}`);
  return ADARI_ASSET_MANIFESTS[DEFAULT_MANIFEST_KEY]!;
}

/**
 * Cadeia de fallback de estados visuais (spec §21): um estado sem asset cai
 * no parente mais próximo até `idle`. Nunca lança, nunca devolve tela vazia.
 */
const STATE_FALLBACK: Partial<Record<AdariVisualState, AdariVisualState>> = {
  blink: 'idle',
  breathing: 'idle',
  evolving: 'happy',
  receivingAffection: 'happy',
  excitedAfterActivity: 'happy',
  victory: 'happy',
  happy: 'idle',
  curious: 'idle',
  talkingReaction: 'curious',
  askingForWalk: 'curious',
  eating: 'idle',
  refusingFood: 'eating',
  sleeping: 'resting',
  wakingUp: 'resting',
  tired: 'resting',
  resting: 'idle',
  battleReady: 'idle',
  attacking: 'battleReady',
  defending: 'battleReady',
  takingDamage: 'battleReady',
  defeat: 'takingDamage',
};

function supportsState(manifest: AdariAssetManifest, state: AdariVisualState): boolean {
  return !manifest.supportedStates || manifest.supportedStates.includes(state);
}

export function resolveVisualState(
  manifest: AdariAssetManifest,
  state: AdariVisualState,
): AdariVisualState {
  let current: AdariVisualState | undefined = state;
  const seen = new Set<AdariVisualState>();
  while (current && !seen.has(current)) {
    if (supportsState(manifest, current)) {
      if (current !== state) devWarn(`estado ${state} sem asset em ${manifest.key}; usando ${current}`);
      return current;
    }
    seen.add(current);
    current = STATE_FALLBACK[current];
  }
  devWarn(`estado ${state} sem fallback em ${manifest.key}; usando idle`);
  return 'idle';
}

/** Tamanho renderizado do estágio no contexto (escala §22 sobre o tamanho base). */
export function resolveStageSize(
  manifest: AdariAssetManifest,
  context: 'home' | 'battle',
  baseSize: number,
): number {
  const scale = context === 'battle' ? manifest.renderConfig.scaleBattle : manifest.renderConfig.scaleHome;
  return Math.round(baseSize * scale);
}
