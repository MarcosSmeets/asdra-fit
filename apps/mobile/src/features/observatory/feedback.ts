export type ObservatorySound =
  | 'footstep'
  | 'portal'
  | 'affection'
  | 'feeding'
  | 'sleep'
  | 'reaction'
  | 'confirmation'
  | 'ambience';

export interface ObservatoryFeedbackPreferences {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface ObservatoryFeedbackAdapter {
  preload(): Promise<void>;
  play(sound: ObservatorySound): Promise<void>;
  lightImpact(): Promise<void>;
  pause(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Adaptador silencioso usado enquanto os sons finais não existem. A cena depende
 * desta interface, não de uma biblioteca específica, evitando áudio alto ao abrir.
 */
export class SilentObservatoryFeedback implements ObservatoryFeedbackAdapter {
  async preload(): Promise<void> {}
  async play(_sound: ObservatorySound): Promise<void> {}
  async lightImpact(): Promise<void> {}
  async pause(): Promise<void> {}
  async dispose(): Promise<void> {}
}

