import { z } from 'zod';
import { LEAGUE } from '@ad-sidera/config';

export const createLeagueSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  maxMembers: z
    .number()
    .int()
    .min(2)
    .max(LEAGUE.MAX_MEMBERS_LIMIT)
    .default(LEAGUE.DEFAULT_MAX_MEMBERS),
});
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const updateLeagueSchema = z
  .object({
    name: z.string().min(2).max(60).optional(),
    description: z.string().max(200).optional(),
    maxMembers: z.number().int().min(2).max(LEAGUE.MAX_MEMBERS_LIMIT).optional(),
  })
  .strict();
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

export const joinLeagueSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(12)
    .transform((v) => v.trim().toUpperCase()),
});
export type JoinLeagueInput = z.infer<typeof joinLeagueSchema>;

export const createInviteSchema = z.object({
  expiresInDays: z.number().int().min(1).max(90).optional(),
  usageLimit: z.number().int().min(1).max(1000).optional(),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const updateInviteSchema = z
  .object({
    active: z.boolean().optional(),
    regenerate: z.boolean().optional(),
  })
  .strict();
export type UpdateInviteInput = z.infer<typeof updateInviteSchema>;
