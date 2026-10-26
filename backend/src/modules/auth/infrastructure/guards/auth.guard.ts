import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  AUTH_SERVICE_PORT,
  type AuthServicePort,
} from '../../domain/ports/auth-service.port.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_SERVICE_PORT)
    private readonly authService: AuthServicePort,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    // Verify session using request headers (which includes cookies and bearer tokens)
    const verification = await this.authService.verifySession(
      token ?? (request.headers as Record<string, string | string[] | undefined>),
    );

    if (!verification) {
      throw new UnauthorizedException('Authentication required');
    }

    if (verification.session.isExpired()) {
      throw new UnauthorizedException('Session expired');
    }

    if (verification.user.banned) {
      throw new UnauthorizedException('Account suspended');
    }

    request.user = verification.user;
    request.session = verification.session;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }
    return undefined;
  }
}
