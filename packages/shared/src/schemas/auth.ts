import { z } from 'zod';
import { PLATFORMS } from '../enums';
import { uuidSchema } from './common';

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .max(128);

export const registerSchema = z.object({
  displayName: z.string().min(1).max(60),
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  timezone: z.string().min(1).default('UTC'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const convertLocalProfileSchema = registerSchema.extend({
  operationId: uuidSchema,
  localProfileId: uuidSchema,
});
export type ConvertLocalProfileInput = z.infer<typeof convertLocalProfileSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const registerDeviceSchema = z.object({
  installationId: uuidSchema,
  platform: z.enum(PLATFORMS),
  pushToken: z.string().max(512).optional(),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
