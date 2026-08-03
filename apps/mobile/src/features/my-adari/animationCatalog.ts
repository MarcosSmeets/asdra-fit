import type { AdariVisualState } from './state';

export interface SpriteAnimationDefinition {
  key: string;
  assetKey: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
  /**
   * Frames que disparam eventos de cena (passo, impacto, partícula) — índices
   * dentro da sequência. Opcional: a arte quadro a quadro final preenche.
   */
  eventFrames?: readonly number[];
}

export interface AdariMotionDefinition {
  anticipationMs: number;
  actionMs: number;
  reactionMs: number;
  returnMs: number;
  loop: boolean;
}

/**
 * `idle` NÃO entra aqui: a pose de repouso é estática (decisão pós-Build 5) —
 * o Adari só se move nas ações e nos estados contínuos abaixo. `breathing` é a
 * alternativa animada, usada apenas quando a cena pedir explicitamente.
 */
const LOOPING = new Set<AdariVisualState>(['breathing', 'resting', 'sleeping', 'battleReady', 'evolving']);

const MOTION_OVERRIDES: Partial<Record<AdariVisualState, Partial<AdariMotionDefinition>>> = {
  blink: { anticipationMs: 0, actionMs: 90, reactionMs: 60, returnMs: 60 },
  breathing: { anticipationMs: 0, actionMs: 1400, reactionMs: 0 },
  evolving: { anticipationMs: 220, actionMs: 640, reactionMs: 640 },
  receivingAffection: { anticipationMs: 70, actionMs: 260, reactionMs: 420 },
  eating: { anticipationMs: 120, actionMs: 420, reactionMs: 360 },
  refusingFood: { actionMs: 320, reactionMs: 420 },
  talkingReaction: { anticipationMs: 90, actionMs: 440, reactionMs: 520 },
  excitedAfterActivity: { actionMs: 520, reactionMs: 520 },
  attacking: { anticipationMs: 140, actionMs: 260, reactionMs: 180 },
  defending: { anticipationMs: 100, actionMs: 300, reactionMs: 420 },
  takingDamage: { anticipationMs: 40, actionMs: 240, reactionMs: 300 },
};

export function adariMotionFor(state: AdariVisualState): AdariMotionDefinition {
  return {
    anticipationMs: 100,
    actionMs: 340,
    reactionMs: 380,
    returnMs: 240,
    loop: LOOPING.has(state),
    ...MOTION_OVERRIDES[state],
  };
}

const CREATURE_KEYS = ['terravok', 'lumora', 'solivar'] as const;

/**
 * Contrato único para os sheets finais. O atlas v1 possui um frame por estado;
 * `AdariAnimator` fornece antecipação/reação/retorno até a arte quadro a quadro chegar.
 */
export const ADARI_SPRITE_ANIMATIONS: Readonly<Record<string, SpriteAnimationDefinition>> =
  Object.fromEntries(
    CREATURE_KEYS.flatMap((creatureKey) =>
      (Object.keys({
        idle: 1, blink: 1, breathing: 1, happy: 1, curious: 1, talkingReaction: 1,
        receivingAffection: 1, eating: 1, refusingFood: 1, resting: 1, sleeping: 1,
        wakingUp: 1, tired: 1, excitedAfterActivity: 1, askingForWalk: 1, battleReady: 1,
        attacking: 1, defending: 1, takingDamage: 1, victory: 1, defeat: 1, evolving: 1,
      }) as AdariVisualState[]).map((state) => {
        const motion = adariMotionFor(state);
        const key = `${creatureKey}.${state}`;
        return [key, {
          key,
          assetKey: `adari-action-atlas-v2:${creatureKey}`,
          frameWidth: 256,
          frameHeight: 256,
          frames: state === 'sleeping' ? 1 : 4,
          frameDurationMs: motion.actionMs,
          loop: motion.loop,
          anchorX: 0.5,
          anchorY: 0.94,
        } satisfies SpriteAnimationDefinition];
      }),
    ),
  );

export function spriteAnimationFor(
  creatureKey: string,
  state: AdariVisualState,
): SpriteAnimationDefinition {
  return ADARI_SPRITE_ANIMATIONS[`${creatureKey}.${state}`]
    ?? ADARI_SPRITE_ANIMATIONS[`solivar.${state}`]!;
}
