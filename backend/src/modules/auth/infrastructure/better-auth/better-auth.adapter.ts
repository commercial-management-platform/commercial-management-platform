import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromNodeHeaders } from 'better-auth/node';
import {
  AuthServicePort,
  LoginResult,
  SessionVerificationResult,
  SignUpParams,
} from '../../domain/ports/auth-service.port.js';
import { AuthUser } from '../../domain/entities/auth-user.entity.js';
import { AuthSession } from '../../domain/entities/auth-session.entity.js';
import { UserRole } from '../../domain/types/user-role.enum.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import {
  createBetterAuthInstance,
  type BetterAuthInstance,
} from './auth.instance.js';
import type { EnvironmentVariables } from '../../../../config/env.validation.js';

export const BETTER_AUTH_INSTANCE = Symbol('BETTER_AUTH_INSTANCE');

@Injectable()
export class BetterAuthAdapter implements AuthServicePort {
  private readonly auth: BetterAuthInstance;

  constructor(
    @Optional()
    @Inject(BETTER_AUTH_INSTANCE)
    injectedAuth?: BetterAuthInstance,
    @Optional()
    configService?: ConfigService<EnvironmentVariables, true>,
  ) {
    if (injectedAuth) {
      this.auth = injectedAuth;
    } else if (configService) {
      this.auth = createBetterAuthInstance({
        DB_HOST: configService.get('DB_HOST', { infer: true }),
        DB_PORT: configService.get('DB_PORT', { infer: true }),
        DB_USER: configService.get('DB_USER', { infer: true }),
        DB_PASSWORD: configService.get('DB_PASSWORD', { infer: true }),
        DB_NAME: configService.get('DB_NAME', { infer: true }),
        DB_SSL: configService.get('DB_SSL', { infer: true }),
        BETTER_AUTH_SECRET: configService.get('BETTER_AUTH_SECRET', {
          infer: true,
        }),
        BETTER_AUTH_URL: configService.get('BETTER_AUTH_URL', { infer: true }),
      });
    } else {
      throw new Error(
        'BetterAuthAdapter requires either BETTER_AUTH_INSTANCE or ConfigService',
      );
    }
  }

  async signInEmail(email: string, password: string): Promise<LoginResult> {
    try {
      const res = await this.auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      if (!res || !res.user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const token = res.token ?? '';
      const authUser = this.mapUser(res.user as Record<string, unknown>);
      const authSession = new AuthSession({
        id: token || authUser.id,
        token,
        userId: authUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        user: authUser,
        session: authSession,
        token,
      };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.toLowerCase().includes('credential') ||
        message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('not found')
      ) {
        throw new UnauthorizedError('Invalid credentials');
      }
      throw new UnauthorizedError('Authentication failed');
    }
  }

  async signOut(token: string): Promise<void> {
    try {
      const headers = new Headers();
      headers.set('authorization', `Bearer ${token}`);
      headers.set('cookie', `better-auth.session_token=${token}`);
      await this.auth.api.signOut({ headers });
    } catch {
      // Best-effort session invalidation
    }
  }

  async verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ): Promise<SessionVerificationResult | null> {
    try {
      let headers: Headers;
      if (typeof headersOrToken === 'string') {
        headers = new Headers();
        headers.set('authorization', `Bearer ${headersOrToken}`);
        headers.set('cookie', `better-auth.session_token=${headersOrToken}`);
      } else {
        headers = fromNodeHeaders(headersOrToken);
      }

      const res = await this.auth.api.getSession({
        headers,
      });

      if (!res || !res.user || !res.session) {
        return null;
      }

      return {
        user: this.mapUser(res.user as Record<string, unknown>),
        session: this.mapSession(res.session as Record<string, unknown>),
      };
    } catch {
      return null;
    }
  }

  async signUpEmail(params: SignUpParams): Promise<LoginResult> {
    try {
      const res = await this.auth.api.signUpEmail({
        body: {
          email: params.email,
          password: params.password,
          name: params.name,
        },
      });

      if (!res || !res.user) {
        throw new ValidationError('Failed to register user');
      }

      if (params.role) {
        try {
          await this.auth.api.setRole({
            body: {
              userId: (res.user as { id: string }).id,
              role: params.role as unknown as 'admin' | 'user',
            },
            headers: new Headers(),
          });
          (res.user as Record<string, unknown>).role = params.role;
        } catch {
          // Keep default role if setRole not supported in context
        }
      }

      const token = res.token ?? '';
      const authUser = this.mapUser(
        res.user as Record<string, unknown>,
        params.role,
      );
      const authSession = new AuthSession({
        id: token || authUser.id,
        token,
        userId: authUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        user: authUser,
        session: authSession,
        token,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.toLowerCase().includes('already exists') ||
        message.toLowerCase().includes('duplicate')
      ) {
        throw new ConflictError('User already exists');
      }
      throw new ValidationError(message || 'Registration failed');
    }
  }

  private mapUser(
    raw: Record<string, unknown>,
    fallbackRole?: UserRole,
  ): AuthUser {
    const roleString =
      (raw.role as string) ?? fallbackRole ?? UserRole.Advisor;
    const role = Object.values(UserRole).includes(roleString as UserRole)
      ? (roleString as UserRole)
      : UserRole.Advisor;

    return new AuthUser({
      id: String(raw.id),
      email: String(raw.email),
      name: String(raw.name),
      role,
      emailVerified: Boolean(raw.emailVerified),
      createdAt: raw.createdAt
        ? new Date(raw.createdAt as string | number | Date)
        : new Date(),
      updatedAt: raw.updatedAt
        ? new Date(raw.updatedAt as string | number | Date)
        : new Date(),
      banned: Boolean(raw.banned),
    });
  }

  private mapSession(raw: Record<string, unknown>): AuthSession {
    return new AuthSession({
      id: String(raw.id),
      token: String(raw.token),
      userId: String(raw.userId),
      expiresAt: new Date(raw.expiresAt as string | number | Date),
      createdAt: raw.createdAt
        ? new Date(raw.createdAt as string | number | Date)
        : new Date(),
      updatedAt: raw.updatedAt
        ? new Date(raw.updatedAt as string | number | Date)
        : new Date(),
      ipAddress: (raw.ipAddress as string) ?? null,
      userAgent: (raw.userAgent as string) ?? null,
    });
  }
}
