import type { WorldPosition } from '@ad-sidera/shared';

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ObservatoryObjectType =
  | 'nest'
  | 'feeding_table'
  | 'journey_portal'
  | 'goal_board'
  | 'astral_mirror'
  | 'adari';

export interface InteractiveObject {
  id: string;
  type: ObservatoryObjectType;
  position: WorldPosition;
  interactionRadius: number;
  label: string;
  description: string;
  enabled: boolean;
  route?: string;
}

export const OBSERVATORY_WORLD = {
  width: 720,
  height: 1280,
  walkableBounds: { x: 54, y: 292, width: 612, height: 876 } satisfies WorldRect,
  startPosition: { x: 360, y: 890 } satisfies WorldPosition,
  adariStartPosition: { x: 310, y: 940 } satisfies WorldPosition,
  gridSize: 24,
} as const;

/** Colisores simples acompanham os móveis pintados no cenário-base. */
export const STATIC_OBSTACLES: readonly WorldRect[] = [
  { x: 40, y: 245, width: 210, height: 185 }, // ninho
  { x: 34, y: 565, width: 154, height: 180 }, // mesa
  { x: 520, y: 228, width: 166, height: 220 }, // portal
  { x: 566, y: 535, width: 132, height: 205 }, // quadro
  { x: 530, y: 830, width: 172, height: 250 }, // espelho
  { x: 205, y: 550, width: 310, height: 190 }, // tapete central (passável: omitido)
].filter((_, index) => index !== 5);

export const INTERACTIVE_OBJECTS: readonly InteractiveObject[] = [
  {
    id: 'astral-nest',
    type: 'nest',
    position: { x: 250, y: 430 },
    interactionRadius: 112,
    label: 'Descansar',
    description: 'Ninho Astral. Mostra o descanso e a recuperação de Vigor do Adari.',
    enabled: true,
  },
  {
    id: 'feeding-table',
    type: 'feeding_table',
    position: { x: 190, y: 705 },
    interactionRadius: 108,
    label: 'Alimentar',
    description: 'Mesa de Alimentação. Ofereça alimentos guardados ao seu Adari.',
    enabled: true,
  },
  {
    id: 'journey-portal',
    type: 'journey_portal',
    position: { x: 515, y: 445 },
    interactionRadius: 116,
    label: 'Entrar na Jornada',
    description: 'Portal da Jornada. Abre a campanha existente.',
    enabled: true,
    route: '/(tabs)/journey',
  },
  {
    id: 'weekly-goal-board',
    type: 'goal_board',
    position: { x: 548, y: 720 },
    interactionRadius: 110,
    label: 'Ver meta',
    description: 'Quadro de Metas. Resume seu progresso semanal.',
    enabled: true,
    route: '/settings/goal',
  },
  {
    id: 'astral-mirror',
    type: 'astral_mirror',
    position: { x: 518, y: 990 },
    interactionRadius: 118,
    label: 'Ver Adari',
    description: 'Espelho Astral. Mostra os detalhes e a história do seu Adari.',
    enabled: true,
    route: '/adari',
  },
];

