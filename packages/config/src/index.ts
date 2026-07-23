/**
 * Constantes de aplicação transversais (não são regras de domínio/cálculo).
 * As fórmulas e seus coeficientes vivem em `@ad-sidera/shared`.
 */

export const APP_NAME = 'Ad Sidera';
export const APP_TAGLINE = 'Rumo às estrelas através da disciplina diária.';

export const API_VERSION = 'v1';
export const API_BASE_PATH = '/api/v1';

/** Versão do conteúdo estático (criaturas, regiões, adversários). */
export const CONTENT_VERSION = 1;

/**
 * Versão das regras de cálculo (XP, recompensa, ranking). Gravada em cada cálculo.
 * v2: recompensa diária decrescente por posição (1.0/0.25/0.0) + recálculo por dia.
 * v3: a energia da atividade vira um pequeno bônus de Vigor (só a 1ª elegível do dia).
 * Recompensas históricas (v1/v2) não são recalculadas retroativamente.
 */
export const CALCULATION_VERSION = 3;

/**
 * Versões independentes dos subsistemas de batalha. Cada cálculo grava a sua versão
 * para que registros antigos não sejam recalculados silenciosamente ao rebalancear.
 */
/** Motor de batalha (recargas por turno, dano, IA, chefes). */
export const BATTLE_CALCULATION_VERSION = 1;
/** Recurso de descanso Vigor (recuperação por tempo, custos). */
export const VIGOR_CALCULATION_VERSION = 1;
/** Conteúdo de habilidades dos Adaris (nomes, tipos, desbloqueio). */
export const ABILITY_CONTENT_VERSION = 1;
/** Balanceamento e escalonamento de adversários. */
export const ENEMY_BALANCE_VERSION = 1;

export const LEAGUE = {
  DEFAULT_MAX_MEMBERS: 20,
  MAX_MEMBERS_LIMIT: 20,
  INVITE_CODE_LENGTH: 8,
  /** Sem caracteres ambíguos (I, O, 0, 1, L). */
  INVITE_CODE_ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** Limite defensivo de payload de sincronização por requisição. */
export const SYNC = {
  MAX_OPERATIONS_PER_REQUEST: 200,
} as const;

export const SUPPORT = {
  PRIVACY_CONTACT: 'privacidade@adsidera.app',
} as const;
