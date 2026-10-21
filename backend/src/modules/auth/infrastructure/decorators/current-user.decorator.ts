import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../domain/entities/auth-user.entity.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  session?: unknown;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
