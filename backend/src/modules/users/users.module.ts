import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '../auth/infrastructure/persistence/entities/user.orm-entity.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  AUTH_SERVICE_PORT,
  type AuthServicePort,
} from '../auth/domain/ports/auth-service.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './domain/ports/user.repository.js';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository.js';
import {
  ADVISOR_PROFILE_PORT,
  type AdvisorProfilePort,
} from './application/ports/advisor-profile.port.js';
import { TypeOrmAdvisorProfileAdapter } from './infrastructure/persistence/typeorm-advisor-profile.adapter.js';
import { AdvisorOrmEntity } from './infrastructure/persistence/entities/advisor.orm-entity.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { ChangeUserRoleUseCase } from './application/use-cases/change-user-role.use-case.js';
import { SetUserStatusUseCase } from './application/use-cases/set-user-status.use-case.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, AdvisorOrmEntity]),
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [
    TypeOrmUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: TypeOrmUserRepository,
    },
    {
      provide: ListUsersUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (repo: UserRepository) => new ListUsersUseCase(repo),
    },
    {
      provide: GetUserUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (repo: UserRepository) => new GetUserUseCase(repo),
    },
    TypeOrmAdvisorProfileAdapter,
    {
      provide: ADVISOR_PROFILE_PORT,
      useExisting: TypeOrmAdvisorProfileAdapter,
    },
    {
      provide: CreateUserUseCase,
      inject: [USER_REPOSITORY, AUTH_SERVICE_PORT, ADVISOR_PROFILE_PORT],
      useFactory: (
        repo: UserRepository,
        auth: AuthServicePort,
        advisors: AdvisorProfilePort,
      ) => new CreateUserUseCase(repo, auth, advisors),
    },
    {
      provide: UpdateUserUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (repo: UserRepository) => new UpdateUserUseCase(repo),
    },
    {
      provide: ChangeUserRoleUseCase,
      inject: [USER_REPOSITORY, ADVISOR_PROFILE_PORT],
      useFactory: (repo: UserRepository, advisors: AdvisorProfilePort) =>
        new ChangeUserRoleUseCase(repo, advisors),
    },
    {
      provide: SetUserStatusUseCase,
      inject: [USER_REPOSITORY, ADVISOR_PROFILE_PORT],
      useFactory: (repo: UserRepository, advisors: AdvisorProfilePort) =>
        new SetUserStatusUseCase(repo, advisors),
    },
  ],
  exports: [
    USER_REPOSITORY,
    ListUsersUseCase,
    GetUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    ChangeUserRoleUseCase,
    SetUserStatusUseCase,
  ],
})
export class UsersModule {}
