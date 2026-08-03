import React, { useMemo } from 'react';
import { resolveAdariManifest, resolveStageSize } from '../../content/adari';
import type { AdariVisualState } from '../../features/my-adari/state';
import { AdariAnimator } from './AdariAnimator';

export interface AdariRendererProps {
  creatureKey: string;
  /** Estágio evolutivo persistido (0..3). */
  stage: number;
  state: AdariVisualState;
  /** Cena que define a escala do estágio (§22): home ou batalha. */
  context: 'home' | 'battle';
  /** Tamanho de referência do estágio EV 2 (escala 1.0); os demais derivam. */
  baseSize: number;
  interactionEnabled?: boolean;
  onAffectionGesture?: () => void;
  accessibilityLabel: string;
  reduceMotion?: boolean;
}

/**
 * Renderizador stage-aware (evolução do AdariAnimator, spec §22-23): resolve o
 * manifest do estágio e aplica a escala da cena. É o componente que as cenas
 * (home/batalha) devem usar — AdariAnimator vira detalhe interno.
 */
export function AdariRenderer({
  creatureKey,
  stage,
  state,
  context,
  baseSize,
  interactionEnabled,
  onAffectionGesture,
  accessibilityLabel,
  reduceMotion,
}: AdariRendererProps): React.ReactElement {
  const manifest = useMemo(() => resolveAdariManifest(creatureKey, stage), [creatureKey, stage]);
  const size = resolveStageSize(manifest, context, baseSize);
  return (
    <AdariAnimator
      creatureKey={creatureKey}
      stage={manifest.stageInt}
      state={state}
      size={size}
      interactionEnabled={interactionEnabled}
      onAffectionGesture={onAffectionGesture}
      accessibilityLabel={accessibilityLabel}
      reduceMotion={reduceMotion}
    />
  );
}
