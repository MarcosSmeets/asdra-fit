import { z } from 'zod';
import { uuidSchema } from './common';

/** Cria/desafia um duelo amistoso contra um membro da mesma liga. */
export const createDuelSchema = z.object({
  opponentUserId: uuidSchema,
});
export type CreateDuelInput = z.infer<typeof createDuelSchema>;
