import type {
  AdariBehaviorState,
  ActivityType,
  AttributeSet,
  Intensity,
  Mood,
  MovementSignal,
  SyncStatus,
} from '@ad-sidera/shared';

export interface CreatureState {
  id: string;
  creatureKey: string;
  nickname: string | null;
  level: number;
  xp: number;
  /** Inteiro persistido 0..3 (BASE, EV 1, EV 2, PERFEITA) — ver stageFromInt. */
  evolutionStage: number;
  /** Instante ISO da última evolução (null = nunca evoluiu). */
  evolvedAt: string | null;
  /** `attributes.energy` é o Vigor ATUAL (recurso de descanso). */
  attributes: AttributeSet;
  /** Vigor máximo (teto de descanso). */
  maxVigor: number;
  /** Pontos de Vigor recuperados por hora (derivado do atributo Recuperação). */
  vigorRecoveryRate: number;
  /** Instante ISO do último cálculo de recuperação de Vigor. */
  lastVigorCalculationAt: string;
  /** Confiança e história compartilhada, de 0 a 100. */
  bond: number;
  /** Desejo cosmético de receber alimento, de 0 a 100. */
  satiety: number;
  lastSatietyCalculationAt: string;
  activeBehaviorState: AdariBehaviorState;
  lastInteractionAt: string | null;
  /** IDs das habilidades equipadas (máx 4). Vazio = usar o conjunto padrão do nível. */
  equippedAbilities: string[];
  defeatedMilestones: string[];
  totalActivities: number;
  updatedAt: string;
  syncStatus: SyncStatus;
}

/** Registro de UMA transição de estágio (histórico único por transição). */
export interface AdariEvolutionHistoryRecord {
  id: string;
  userAdariId: string;
  fromStage: number;
  toStage: number;
  unlockedAt: string;
  triggeringReason: string;
  calculationVersion: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface FoodInventoryItem {
  foodDefinitionId: string;
  quantity: number;
  updatedAt: string;
}

export type AdariInteractionType =
  | 'pet'
  | 'feed'
  | 'activity'
  | 'weekly_goal'
  | 'boss'
  | 'return'
  | 'evolution'
  | 'milestone';

export interface AdariInteractionRecord {
  id: string;
  clientGeneratedId: string;
  userAdariId: string;
  interactionType: AdariInteractionType;
  foodDefinitionId: string | null;
  bondGranted: number;
  satietyGranted: number;
  occurredAt: string;
  localDate: string;
  timezone: string;
  calculationVersion: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

export type ObservatoryControlMode = 'tap' | 'directional';
export type ObservatoryQualityMode = 'automatic' | 'high' | 'economy';

export interface ObservatoryStateRecord {
  id: string;
  selectedControlMode: ObservatoryControlMode;
  lastSafePlayerPosition: { x: number; y: number };
  unlockedObjects: string[];
  seenDialogueKeys: string[];
  tutorialCompleted: boolean;
  reduceMotion: boolean;
  particlesEnabled: boolean;
  movementSpeed: number;
  qualityMode: ObservatoryQualityMode;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  hapticsEnabled: boolean;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  clientGeneratedId: string;
  activityType: ActivityType;
  occurredAt: string;
  durationMinutes: number;
  perceivedIntensity: Intensity;
  notes: string | null;
  location: string | null;
  moodBefore: Mood | null;
  moodAfter: Mood | null;
  hasLocalPhoto: boolean;
  localPhotoUri: string | null;
  /** Passos medidos na janela do treino (null = sem dado; nunca afeta recompensa). */
  movementSteps: number | null;
  movementSignal: MovementSignal | null;
  isScored: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface ActivityRewardRecord {
  id: string;
  activityId: string;
  rewardKey: string;
  rewardEligiblePosition: number;
  dailyRewardMultiplier: number;
  baseXp: number;
  finalXp: number;
  baseEnergy: number;
  finalEnergy: number;
  baseAttributeChanges: Partial<AttributeSet>;
  finalAttributeChanges: Partial<AttributeSet>;
  calculatedAt: string;
  calculationVersion: number;
}

export interface WeeklyGoalRecord {
  id: string;
  targetCount: number;
  preferredDays: number[];
  activityTypes: ActivityType[];
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  allowExtraActivities: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface WeeklyProgressRecord {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  targetCount: number;
  validActivityCount: number;
  percentage: number;
  completed: boolean;
  completedAt: string | null;
}

export interface ProfileRecord {
  id: string;
  displayName: string;
  timezone: string;
  locale: string;
  /** Emblema (star/moon/comet/nebula) exibido em liga e duelos. */
  avatarType: string;
  shareCreatureLevel: boolean;
  goal: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export type BattleType = 'pve' | 'duel';
export type BattleResult = 'victory' | 'defeat';

/** Sessão de batalha PvE registrada localmente (idempotente por clientGeneratedId). */
export interface BattleSessionRecord {
  id: string;
  clientGeneratedId: string;
  battleType: BattleType;
  adversaryId: string | null;
  dayKey: string;
  result: BattleResult;
  /** Contou como vitória recompensada (dentro do limite diário). */
  rewarded: boolean;
  xpGranted: number;
  vigorSpent: number;
  seed: number | null;
  turns: number | null;
  battleCalculationVersion: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

/** Progresso diário de batalhas PvE (reinicia por dia local do usuário). */
export interface DailyBattleProgressRecord {
  dayKey: string;
  rewardedWins: number;
  xpGranted: number;
  updatedAt: string;
}
