import type { DifficultyType } from '../constants';
import type { EvolutionRequirements } from '../evolution';
import type { Archetype } from '../enums';
import type { AttributeKey, AttributeSet } from '../types';
import type { BattleAbility, BattleStats, BehaviorProfile, BossConfig } from '../battle/types';

export interface CreatureAbilityDef {
  id: string;
  name: string;
  description: string;
  /** Custo de energia (0 = habilidade básica/gratuita). */
  energyCost: number;
  /** Multiplicador de dano sobre o ataque. */
  power: number;
}

export interface CreatureEvolutionDef {
  toKey: string;
  toName: string;
  description: string;
  requirements: EvolutionRequirements;
}

export interface CreatureDefinition {
  key: string;
  name: string;
  archetype: Archetype;
  affinity: AttributeKey;
  personality: string;
  description: string;
  /** Descrição textual do visual (acessibilidade e placeholder de ilustração). */
  visualDescription: string;
  baseStats: AttributeSet;
  basicAbility: CreatureAbilityDef;
  specialAbility: CreatureAbilityDef;
  evolution: CreatureEvolutionDef;
  contentVersion: number;
}

export interface RegionDefinition {
  key: string;
  order: number;
  name: string;
  theme: string;
  description: string;
  scenario: string;
  /** id do chefe que precisa ser derrotado para desbloquear a região (null = inicial). */
  unlockAfterBoss: string | null;
}

export interface AdversaryReward {
  creatureXp: number;
  energy: number;
}

export interface AdversaryDefinition {
  id: string;
  regionKey: string;
  name: string;
  description: string;
  isBoss: boolean;
  /** Ordem dentro da região (1..5). */
  order: number;
  /** Dificuldade: governa a faixa-alvo de battlePower e o custo de Vigor. */
  difficultyType: DifficultyType;
  /** Nível-base de referência do adversário. */
  baseLevel: number;
  /** Nível efetivo mínimo/máximo (escalonamento híbrido, nunca copia o jogador). */
  minLevel: number;
  maxLevel: number;
  /** Stats no nível-base (antes de crescimento por nível e do ajuste à faixa-alvo). */
  baseStats: BattleStats;
  /** Crescimento por nível acima do base (limitado). */
  statGrowth: Partial<BattleStats>;
  abilities: BattleAbility[];
  behaviorProfile: BehaviorProfile;
  /** Configuração de chefe (apenas para chefes). */
  boss?: BossConfig;
  /** Recompensa legada (exibição/narrativa; a XP de PvE é calculada em pveRewards). */
  reward: AdversaryReward;
  /** id do adversário anterior necessário, ou null se disponível ao entrar na região. */
  unlockAfter: string | null;
}
