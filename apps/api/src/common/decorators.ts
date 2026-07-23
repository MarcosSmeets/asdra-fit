import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest } from './authenticated-request';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como pública (ignora o JwtAuthGuard global). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Injeta o id do usuário autenticado (a partir do JWT verificado). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUserId usado em rota sem autenticação');
    }
    return request.user.userId;
  },
);
