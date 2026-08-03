import {
  loginSchema,
  convertLocalProfileSchema,
  forgotPasswordSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
export class ConvertLocalProfileDto extends createZodDto(convertLocalProfileSchema) {}
export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
