import { CONTENT_VERSION } from '@ad-sidera/config';

export interface WorldPosition {
  x: number;
  y: number;
}

export type AdariBehaviorState =
  | 'idle'
  | 'following'
  | 'running'
  | 'resting'
  | 'eating'
  | 'receivingAffection'
  | 'curious'
  | 'excited'
  | 'sleeping'
  | 'battleReady';

export interface AdariBehaviorProfile {
  followDistance: number;
  movementSpeed: number;
  curiosityLevel: number;
  affectionReaction: string;
  idleAnimations: readonly string[];
  restAnimations: readonly string[];
  feedingAnimations: readonly string[];
  favoriteFoodKeys: readonly string[];
  greeting: string;
}

export const ADARI_BEHAVIOR_PROFILES: Readonly<Record<string, AdariBehaviorProfile>> = {
  terravok: {
    followDistance: 44,
    movementSpeed: 78,
    curiosityLevel: 0.25,
    affectionReaction: 'Brontu se firma ao seu lado e fecha os olhos, contente.',
    idleAnimations: ['steady_breath', 'protective_glance'],
    restAnimations: ['firm_rest', 'deep_sleep'],
    feedingAnimations: ['careful_bite', 'happy_stomp'],
    favoriteFoodKeys: ['golden_root', 'mist_biscuit'],
    greeting: 'Estou aqui. Vamos seguir juntos.',
  },
  lumora: {
    followDistance: 62,
    movementSpeed: 96,
    curiosityLevel: 0.7,
    affectionReaction: 'Velune descreve um pequeno círculo e encosta a testa em sua mão.',
    idleAnimations: ['soft_orbit', 'observe_stars'],
    restAnimations: ['curl_rest', 'ember_sleep'],
    feedingAnimations: ['light_nibble', 'glowing_spin'],
    favoriteFoodKeys: ['astral_fruit', 'celestial_nectar'],
    greeting: 'Há algo novo nas estrelas hoje.',
  },
  solivar: {
    followDistance: 55,
    movementSpeed: 88,
    curiosityLevel: 0.9,
    affectionReaction: 'Myrin inclina a cabeça e responde com um lampejo brincalhão.',
    idleAnimations: ['curious_hop', 'portal_glance'],
    restAnimations: ['wing_fold', 'star_sleep'],
    feedingAnimations: ['playful_taste', 'constellation_burst'],
    favoriteFoodKeys: ['lunar_seed', 'astral_fruit'],
    greeting: 'O Portal parece diferente. Vamos investigar?',
  },
};

export function getAdariBehaviorProfile(creatureKey: string): AdariBehaviorProfile {
  return ADARI_BEHAVIOR_PROFILES[creatureKey] ?? ADARI_BEHAVIOR_PROFILES.solivar!;
}

export interface FoodDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  satietyValue: number;
  bondValue: number;
  preferredByAdariKeys: readonly string[];
  assetKey: string;
  contentVersion: number;
  active: boolean;
}

export const FOOD_DEFINITIONS: readonly FoodDefinition[] = [
  {
    id: 'food-astral-fruit',
    key: 'astral_fruit',
    name: 'Fruto Astral',
    description: 'Fruto fresco que parece guardar um pequeno céu em seu interior.',
    satietyValue: 22,
    bondValue: 1,
    preferredByAdariKeys: ['lumora', 'solivar'],
    assetKey: 'food_astral_fruit',
    contentVersion: CONTENT_VERSION,
    active: true,
  },
  {
    id: 'food-mist-biscuit',
    key: 'mist_biscuit',
    name: 'Biscoito de Bruma',
    description: 'Leve, crocante e cercado por uma bruma aromática.',
    satietyValue: 18,
    bondValue: 1,
    preferredByAdariKeys: ['terravok'],
    assetKey: 'food_mist_biscuit',
    contentVersion: CONTENT_VERSION,
    active: true,
  },
  {
    id: 'food-golden-root',
    key: 'golden_root',
    name: 'Raiz Dourada',
    description: 'Uma raiz firme aquecida pela luz das constelações.',
    satietyValue: 28,
    bondValue: 1,
    preferredByAdariKeys: ['terravok'],
    assetKey: 'food_golden_root',
    contentVersion: CONTENT_VERSION,
    active: true,
  },
  {
    id: 'food-celestial-nectar',
    key: 'celestial_nectar',
    name: 'Néctar Celeste',
    description: 'Uma bebida suave que cintila sob a luz noturna.',
    satietyValue: 20,
    bondValue: 1,
    preferredByAdariKeys: ['lumora'],
    assetKey: 'food_celestial_nectar',
    contentVersion: CONTENT_VERSION,
    active: true,
  },
  {
    id: 'food-lunar-seed',
    key: 'lunar_seed',
    name: 'Semente Lunar',
    description: 'Pequena semente prateada de sabor delicado.',
    satietyValue: 16,
    bondValue: 1,
    preferredByAdariKeys: ['solivar'],
    assetKey: 'food_lunar_seed',
    contentVersion: CONTENT_VERSION,
    active: true,
  },
];

export function getFoodDefinition(idOrKey: string): FoodDefinition | undefined {
  return FOOD_DEFINITIONS.find((food) => food.id === idOrKey || food.key === idOrKey);
}

export const BOND = {
  MIN: 0,
  MAX: 100,
  COMMON_DAILY_CAP: 8,
  FIRST_PET_REWARD: 3,
  SECOND_PET_REWARD: 1,
} as const;

export type BondTierKey =
  | 'first_contact'
  | 'companions'
  | 'attunement'
  | 'astral_bond'
  | 'sidereal_union';

export interface BondTier {
  key: BondTierKey;
  label: string;
  min: number;
  max: number;
}

export const BOND_TIERS: readonly BondTier[] = [
  { key: 'first_contact', label: 'Primeiro Contato', min: 0, max: 19 },
  { key: 'companions', label: 'Companheiros', min: 20, max: 39 },
  { key: 'attunement', label: 'Sintonia', min: 40, max: 59 },
  { key: 'astral_bond', label: 'Laço Astral', min: 60, max: 79 },
  { key: 'sidereal_union', label: 'União Sideral', min: 80, max: 100 },
];

export function clampBond(value: number): number {
  return Math.min(BOND.MAX, Math.max(BOND.MIN, Math.floor(value)));
}

export function bondTierFor(value: number): BondTier {
  const bond = clampBond(value);
  return BOND_TIERS.find((tier) => bond >= tier.min && bond <= tier.max) ?? BOND_TIERS[0]!;
}

export type BondInteractionType =
  | 'pet'
  | 'feed'
  | 'activity'
  | 'weekly_goal'
  | 'boss'
  | 'return'
  | 'evolution'
  | 'milestone';

export interface BondRewardInput {
  interactionType: BondInteractionType;
  currentBond: number;
  commonGrantedToday: number;
  sameTypeCountToday: number;
  favoriteFood?: boolean;
  milestoneReward?: number;
}

export interface BondRewardResult {
  requested: number;
  granted: number;
  nextBond: number;
  dailyCapApplied: boolean;
  bypassedDailyCap: boolean;
}

/** Política única de Vínculo usada pelo cliente offline e revalidada pela API. */
export function calculateBondReward(input: BondRewardInput): BondRewardResult {
  const special = ['weekly_goal', 'boss', 'evolution', 'milestone'].includes(input.interactionType);
  let requested = 0;
  switch (input.interactionType) {
    case 'pet':
      requested =
        input.sameTypeCountToday === 0
          ? BOND.FIRST_PET_REWARD
          : input.sameTypeCountToday === 1
            ? BOND.SECOND_PET_REWARD
            : 0;
      break;
    case 'feed':
      requested = 1 + (input.favoriteFood ? 1 : 0);
      break;
    case 'activity':
      requested = input.sameTypeCountToday === 0 ? 2 : 0;
      break;
    case 'weekly_goal':
      requested = 3;
      break;
    case 'boss':
      requested = 4;
      break;
    case 'return':
      requested = input.sameTypeCountToday === 0 ? 2 : 0;
      break;
    case 'evolution':
      requested = 5;
      break;
    case 'milestone':
      requested = Math.max(0, input.milestoneReward ?? 0);
      break;
  }

  const remainingToday = Math.max(0, BOND.COMMON_DAILY_CAP - input.commonGrantedToday);
  const afterDailyCap = special ? requested : Math.min(requested, remainingToday);
  const nextBond = clampBond(input.currentBond + afterDailyCap);
  const granted = nextBond - clampBond(input.currentBond);
  return {
    requested,
    granted,
    nextBond,
    dailyCapApplied: !special && granted < requested,
    bypassedDailyCap: special,
  };
}

export const SATIETY = {
  MIN: 0,
  MAX: 100,
  DECAY_POINTS: 2,
  DECAY_INTERVAL_HOURS: 6,
  REFUSAL_THRESHOLD: 90,
} as const;

export interface SatietyState {
  satiety: number;
  lastSatietyCalculationAt: string;
}

export interface SatietyResult extends SatietyState {
  decayed: number;
}

export function clampSatiety(value: number): number {
  return Math.min(SATIETY.MAX, Math.max(SATIETY.MIN, Math.floor(value)));
}

/** Decai em blocos completos de seis horas, preservando a fração de tempo. */
export function recalculateSatiety(state: SatietyState, nowIso: string): SatietyResult {
  const now = Date.parse(nowIso);
  const last = Date.parse(state.lastSatietyCalculationAt);
  const current = clampSatiety(state.satiety);
  if (!Number.isFinite(now) || !Number.isFinite(last) || now <= last) {
    return { satiety: current, lastSatietyCalculationAt: state.lastSatietyCalculationAt, decayed: 0 };
  }
  const intervalMs = SATIETY.DECAY_INTERVAL_HOURS * 3_600_000;
  const intervals = Math.floor((now - last) / intervalMs);
  if (intervals <= 0 || current === 0) {
    return { satiety: current, lastSatietyCalculationAt: state.lastSatietyCalculationAt, decayed: 0 };
  }
  const decayed = Math.min(current, intervals * SATIETY.DECAY_POINTS);
  return {
    satiety: current - decayed,
    lastSatietyCalculationAt:
      decayed === current ? nowIso : new Date(last + intervals * intervalMs).toISOString(),
    decayed,
  };
}

export function satietyLabel(value: number): string {
  const satiety = clampSatiety(value);
  if (satiety < 25) return 'Aceitaria uma refeição';
  if (satiety < 50) return 'Com um pouco de fome';
  if (satiety < 75) return 'Satisfeito';
  return 'Muito satisfeito';
}

/**
 * Reposição natural de alimentos. O jogo não tem loja (decisão de produto), então
 * o mundo repõe cada alimento sozinho até um teto: quanto MAIS saciedade o
 * alimento devolve, mais tempo leva para voltar. O cálculo é por tempo decorrido
 * — vale com o app fechado e é determinístico (mesmo relógio ⇒ mesmo estoque).
 */
export const FOOD_REGEN = {
  /** Teto de estoque por alimento (o mundo repõe até aqui, nunca além). */
  MAX_PER_FOOD: 3,
  /** Horas de espera por ponto de saciedade do alimento. */
  HOURS_PER_SATIETY_POINT: 0.25,
  /** Piso de espera, para os alimentos mais leves. */
  MIN_INTERVAL_HOURS: 3,
} as const;

/** Intervalo de reposição de UMA unidade (mais saciedade ⇒ mais lento). */
export function foodRegenIntervalHours(food: FoodDefinition): number {
  const raw = food.satietyValue * FOOD_REGEN.HOURS_PER_SATIETY_POINT;
  return Math.max(FOOD_REGEN.MIN_INTERVAL_HOURS, Math.round(raw * 2) / 2);
}

export interface FoodStockState {
  quantity: number;
  /** Momento da última mudança/recálculo do estoque deste alimento. */
  updatedAt: string;
}

export interface FoodRegenResult extends FoodStockState {
  regenerated: number;
}

/** Repõe em blocos completos, preservando a fração de tempo já corrida. */
export function regenerateFoodStock(
  food: FoodDefinition,
  state: FoodStockState,
  nowIso: string,
): FoodRegenResult {
  const now = Date.parse(nowIso);
  const last = Date.parse(state.updatedAt);
  const quantity = Math.max(0, Math.floor(state.quantity));
  if (!Number.isFinite(now) || !Number.isFinite(last) || now <= last) {
    return { quantity, updatedAt: state.updatedAt, regenerated: 0 };
  }
  if (quantity >= FOOD_REGEN.MAX_PER_FOOD) {
    // Estoque cheio não acumula espera: o relógio só corre depois do consumo.
    return { quantity: FOOD_REGEN.MAX_PER_FOOD, updatedAt: nowIso, regenerated: 0 };
  }
  const intervalMs = foodRegenIntervalHours(food) * 3_600_000;
  const intervals = Math.floor((now - last) / intervalMs);
  if (intervals <= 0) {
    return { quantity, updatedAt: state.updatedAt, regenerated: 0 };
  }
  const regenerated = Math.min(intervals, FOOD_REGEN.MAX_PER_FOOD - quantity);
  return {
    quantity: quantity + regenerated,
    updatedAt: new Date(last + regenerated * intervalMs).toISOString(),
    regenerated,
  };
}

/** Horas até a próxima unidade (0 quando o estoque já está no teto). */
export function hoursUntilNextFood(
  food: FoodDefinition,
  state: FoodStockState,
  nowIso: string,
): number {
  const quantity = Math.max(0, Math.floor(state.quantity));
  const intervalHours = foodRegenIntervalHours(food);
  if (quantity >= FOOD_REGEN.MAX_PER_FOOD) {
    return 0;
  }
  const now = Date.parse(nowIso);
  const last = Date.parse(state.updatedAt);
  if (!Number.isFinite(now) || !Number.isFinite(last) || now <= last) {
    return intervalHours;
  }
  const intervalMs = intervalHours * 3_600_000;
  return (intervalMs - ((now - last) % intervalMs)) / 3_600_000;
}

export interface FeedResult {
  accepted: boolean;
  nextSatiety: number;
  satietyGranted: number;
  favorite: boolean;
}

export function applyFood(
  currentSatiety: number,
  food: FoodDefinition,
  creatureKey: string,
): FeedResult {
  const current = clampSatiety(currentSatiety);
  const favorite = food.preferredByAdariKeys.includes(creatureKey);
  if (current >= SATIETY.REFUSAL_THRESHOLD) {
    return { accepted: false, nextSatiety: current, satietyGranted: 0, favorite };
  }
  const requested = food.satietyValue + (favorite ? 5 : 0);
  const nextSatiety = clampSatiety(current + requested);
  return {
    accepted: true,
    nextSatiety,
    satietyGranted: nextSatiety - current,
    favorite,
  };
}

export interface AdariDialogueContext {
  creatureKey: string;
  bond: number;
  vigor: number;
  maxVigor: number;
  satiety: number;
  weeklyRemaining?: number;
  returning?: boolean;
  nearbyObject?: 'nest' | 'feeding_table' | 'journey_portal' | 'goal_board' | 'astral_mirror';
}

export function adariDialogue(context: AdariDialogueContext): string {
  const profile = getAdariBehaviorProfile(context.creatureKey);
  if (context.returning) return 'Não precisamos recuperar o tempo perdido. Vamos continuar daqui.';
  if (context.vigor < Math.max(15, context.maxVigor * 0.2)) {
    return 'Acho que preciso descansar um pouco antes da próxima batalha.';
  }
  if (context.weeklyRemaining === 1) return 'Falta apenas mais um dia para concluirmos nossa meta.';
  if (context.satiety < 25) return 'A Mesa de Alimentação está com um aroma interessante.';
  if (context.nearbyObject === 'journey_portal') return 'O Portal parece diferente hoje.';
  if (context.bond >= 80) return 'Nossa história já brilha entre as constelações.';
  return profile.greeting;
}
