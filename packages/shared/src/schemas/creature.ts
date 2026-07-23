import { z } from 'zod';

/** Chaves das criaturas iniciais (mantidas em sincronia com content/creatures). */
export const CREATURE_KEYS = ['terravok', 'lumora', 'solivar'] as const;
export type CreatureKey = (typeof CREATURE_KEYS)[number];

export const selectCreatureSchema = z.object({
  creatureKey: z.enum(CREATURE_KEYS),
  nickname: z.string().min(1).max(30).optional(),
});
export type SelectCreatureInput = z.infer<typeof selectCreatureSchema>;

export const updateCreatureSchema = z.object({
  nickname: z.string().min(1).max(30),
});
export type UpdateCreatureInput = z.infer<typeof updateCreatureSchema>;
