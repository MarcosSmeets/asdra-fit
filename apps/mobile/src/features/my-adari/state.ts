export type AdariVisualState =
  | 'idle'
  | 'blink'
  | 'breathing'
  | 'happy'
  | 'curious'
  | 'talkingReaction'
  | 'receivingAffection'
  | 'eating'
  | 'refusingFood'
  | 'resting'
  | 'sleeping'
  | 'wakingUp'
  | 'tired'
  | 'excitedAfterActivity'
  | 'askingForWalk'
  | 'battleReady'
  | 'attacking'
  | 'defending'
  | 'takingDamage'
  | 'victory'
  | 'defeat'
  | 'evolving';

export type MyAdariScreenState =
  | 'loadingEssentialAssets'
  | 'ready'
  | 'petting'
  | 'feeding'
  | 'talking'
  | 'resting'
  | 'transitioning'
  | 'recoverableError';

export type AdariHomeState = 'idle' | 'petting' | 'feeding' | 'talking' | 'resting' | 'sleeping' | 'excited';

export type MyAdariEvent =
  | 'ASSETS_READY'
  | 'PET'
  | 'FEED'
  | 'TALK'
  | 'REST'
  | 'TRANSITION'
  | 'COMPLETE'
  | 'FAIL'
  | 'RETRY';

export function reduceMyAdariState(
  current: MyAdariScreenState,
  event: MyAdariEvent,
): MyAdariScreenState {
  if (event === 'FAIL') return 'recoverableError';
  if (event === 'RETRY') return 'loadingEssentialAssets';
  if (event === 'ASSETS_READY' || event === 'COMPLETE') return 'ready';
  if (current !== 'ready') return current;
  if (event === 'PET') return 'petting';
  if (event === 'FEED') return 'feeding';
  if (event === 'TALK') return 'talking';
  if (event === 'REST') return 'resting';
  if (event === 'TRANSITION') return 'transitioning';
  return current;
}

export function visualStateForScreenState(state: MyAdariScreenState): AdariVisualState {
  if (state === 'petting') return 'receivingAffection';
  if (state === 'feeding') return 'eating';
  if (state === 'talking') return 'talkingReaction';
  if (state === 'resting') return 'resting';
  return 'idle';
}

export const ADARI_VISUAL_STATE_LABELS: Readonly<Record<AdariVisualState, string>> = {
  idle: 'Tranquilo',
  blink: 'Tranquilo',
  breathing: 'Tranquilo',
  happy: 'Feliz',
  curious: 'Curioso',
  talkingReaction: 'Conversando com você',
  receivingAffection: 'Recebendo carinho',
  eating: 'Aproveitando a refeição',
  refusingFood: 'Satisfeito',
  resting: 'Relaxando',
  sleeping: 'Dormindo',
  wakingUp: 'Acordando',
  tired: 'Precisando descansar',
  excitedAfterActivity: 'Animado com sua atividade',
  askingForWalk: 'Querendo passear',
  battleReady: 'Pronto para a Jornada',
  attacking: 'Atacando',
  defending: 'Defendendo',
  takingDamage: 'Reagindo ao golpe',
  victory: 'Celebrando a vitória',
  defeat: 'Recuperando o fôlego',
  evolving: 'Evoluindo',
};
