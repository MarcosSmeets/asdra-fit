// Tipos e enums de domínio
export * from './types';
export * from './enums';
export * from './constants';

// Utilidades puras
export * from './rng';
export * from './utils/inviteCode';

// Regras de progressão e pontuação (fonte única — não duplicar em app/api)
export * from './xp';
export * from './rewards';
export * from './vigor';
export * from './pveRewards';
export * from './dailyRewards';
export * from './weekly';
export * from './activityCounting';
export * from './streak';
export * from './ranking';
export * from './evolution';
export * from './ability';
export * from './battlePower';
export * from './enemyScaling';
export * from './duel';
export * from './time';
export * from './observatory';
export * from './avatar';

// Batalha
export * from './battle';

// Conteúdo versionado (criaturas, regiões, adversários)
export * from './content';

// Contratos (schemas Zod + tipos de API/sync)
export * from './schemas';
