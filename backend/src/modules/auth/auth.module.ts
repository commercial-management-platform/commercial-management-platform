import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AUTH_SERVICE_PORT,
  type AuthServicePort,
} from './domain/ports/auth-service.port.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { VerifySessionUseCase } from './application/use-cases/verify-session.use-case.js';
import {
  BetterAuthAdapter,
  BETTER_AUTH_INSTANCE,
} from './infrastructure/better-auth/better-auth.adapter.js';
import {
  createBetterAuthInstance,
  type BetterAuthInstance,
} from './infrastructure/better-auth/auth.instance.js';
import { AuthGuard } from './infrastructure/guards/auth.guard.js';
import { RolesGuard } from './infrastructure/guards/roles.guard.js';
import { AuthController } from './presentation/auth.controller.js';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity.js';
import { SessionOrmEntity } from './infrastructure/persistence/entities/session.orm-entity.js';
import { AccountOrmEntity } from './infrastructure/persistence/entities/account.orm-entity.js';
import { VerificationOrmEntity } from './infrastructure/persistence/entities/verification.orm-entity.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      SessionOrmEntity,
      AccountOrmEntity,
      VerificationOrmEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: BETTER_AUTH_INSTANCE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        createBetterAuthInstance({
          DB_HOST: config.get('DB_HOST', { infer: true }),
          DB_PORT: config.get('DB_PORT', { infer: true }),
          DB_USER: config.get('DB_USER', { infer: true }),
          DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
          DB_NAME: config.get('DB_NAME', { infer: true }),
          DB_SSL: config.get('DB_SSL', { infer: true }),
          BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET', { infer: true }),
          BETTER_AUTH_URL: config.get('BETTER_AUTH_URL', { infer: true }),
        }),
    },
    {
      provide: AUTH_SERVICE_PORT,
      inject: [BETTER_AUTH_INSTANCE],
      useFactory: (authInstance: BetterAuthInstance) =>
        new BetterAuthAdapter(authInstance),
    },
    {
      provide: LoginUseCase,
      inject: [AUTH_SERVICE_PORT],
      useFactory: (authService: AuthServicePort) =>
        new LoginUseCase(authService),
    },
    {
      provide: LogoutUseCase,
      inject: [AUTH_SERVICE_PORT],
      useFactory: (authService: AuthServicePort) =>
        new LogoutUseCase(authService),
    },
    {
      provide: VerifySessionUseCase,
      inject: [AUTH_SERVICE_PORT],
      useFactory: (authService: AuthServicePort) =>
        new VerifySessionUseCase(authService),
    },
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    AUTH_SERVICE_PORT,
    AuthGuard,
    RolesGuard,
    LoginUseCase,
    LogoutUseCase,
    VerifySessionUseCase,
  ],
})
export class AuthModule {}
