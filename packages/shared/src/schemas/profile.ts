import { z } from 'zod';
import { AVATAR_TYPES } from '../enums';
import { GOALS } from '../enums';

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(60).optional(),
    timezone: z.string().min(1).optional(),
    locale: z.string().min(2).max(10).optional(),
    avatarType: z.enum(AVATAR_TYPES).optional(),
    shareCreatureLevel: z.boolean().optional(),
    goal: z.enum(GOALS).nullable().optional(),
    /**
     * @deprecated O Explorador foi removido. O campo continua ACEITO e é
     * descartado antes da escrita: clientes antigos enviam ele em toda push de
     * perfil, e o `.strict()` abaixo faria a operação falhar para sempre na
     * outbox. Remover só quando não houver mais cliente antigo em campo.
     */
    avatarAppearance: z.unknown().optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
