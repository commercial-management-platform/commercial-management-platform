import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ACTIVITY_LOG } from '../../shared/application/ports/activity-log.port.js';
import { ActivityLogWriterModule } from '../activity-log/activity-log-writer.module.js';
import { VISIT_REPOSITORY } from '../visits/domain/visit.repository.js';
import { TypeOrmVisitRepository } from '../visits/infrastructure/repositories/visit.repository.impl.js';
import { VisitOrmEntity } from '../visits/infrastructure/persistence/entities/visit.orm-entity.js';
import { VisitOutcomeOrmEntity } from '../visits/infrastructure/persistence/entities/visit-outcome.orm-entity.js';
import { AdvisorOrmEntity } from '../users/infrastructure/persistence/entities/advisor.orm-entity.js';
import { FOLLOW_UP_REPOSITORY } from './domain/ports/follow-up.repository.js';
import { TypeOrmFollowUpRepository } from './infrastructure/repositories/typeorm-follow-up.repository.js';
import { FollowUpOrmEntity } from './infrastructure/persistence/entities/follow-up.orm-entity.js';
import { CreateFollowUpUseCase } from './application/use-cases/create-follow-up.use-case.js';
import { ListFollowUpsUseCase } from './application/use-cases/list-follow-ups.use-case.js';
import { GetFollowUpUseCase } from './application/use-cases/get-follow-up.use-case.js';
import { UpdateFollowUpUseCase } from './application/use-cases/update-follow-up.use-case.js';
import { CompleteFollowUpUseCase } from './application/use-cases/complete-follow-up.use-case.js';
import { FollowUpsController } from './presentation/controllers/follow-ups.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowUpOrmEntity, VisitOrmEntity, VisitOutcomeOrmEntity, AdvisorOrmEntity]),
    AuthModule,
    ActivityLogWriterModule,
  ],
  controllers: [FollowUpsController],
  providers: [
    { provide: FOLLOW_UP_REPOSITORY, useClass: TypeOrmFollowUpRepository },
    { provide: VISIT_REPOSITORY, useClass: TypeOrmVisitRepository },
    {
      provide: CreateFollowUpUseCase,
      inject: [FOLLOW_UP_REPOSITORY, VISIT_REPOSITORY, ACTIVITY_LOG],
      useFactory: (fuRepo: any, visitRepo: any, activityLog: any) => new CreateFollowUpUseCase(fuRepo, visitRepo, activityLog),
    },
    {
      provide: ListFollowUpsUseCase,
      inject: [FOLLOW_UP_REPOSITORY],
      useFactory: (fuRepo: any) => new ListFollowUpsUseCase(fuRepo),
    },
    {
      provide: GetFollowUpUseCase,
      inject: [FOLLOW_UP_REPOSITORY],
      useFactory: (fuRepo: any) => new GetFollowUpUseCase(fuRepo),
    },
    {
      provide: UpdateFollowUpUseCase,
      inject: [FOLLOW_UP_REPOSITORY],
      useFactory: (fuRepo: any) => new UpdateFollowUpUseCase(fuRepo),
    },
    {
      provide: CompleteFollowUpUseCase,
      inject: [FOLLOW_UP_REPOSITORY, VISIT_REPOSITORY, ACTIVITY_LOG],
      useFactory: (fuRepo: any, visitRepo: any, activityLog: any) => new CompleteFollowUpUseCase(fuRepo, visitRepo, activityLog),
    },
  ],
})
export class FollowUpsModule {}
