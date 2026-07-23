/** Conjunto de atributos de uma criatura. */
export interface AttributeSet {
  strength: number;
  endurance: number;
  agility: number;
  discipline: number;
  recovery: number;
  spirit: number;
  health: number;
  energy: number;
}

/** Chaves de atributo que evoluem por atividade/afinidade. */
export type AttributeKey = keyof AttributeSet;

/** Alterações (delta) aplicadas a um subconjunto de atributos. */
export type AttributeChanges = Partial<Record<AttributeKey, number>>;

/** Entrada mínima de uma atividade para efeito de cálculo de recompensa. */
export interface ActivityInput {
  activityType: string;
  perceivedIntensity: string;
  durationMinutes: number;
  /** Ocorrência em ISO (UTC). */
  occurredAt: string;
}
