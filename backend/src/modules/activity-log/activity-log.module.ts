import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../clients/application/ports/advisor-client-access.port.js';
import { ClientsModule } from '../clients/clients.module.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../clients/domain/repositories/client.repository.js';
import { GetClientActivityUseCase } from './application/use-cases/get-client-activity.use-case.js';
import {
  ACTIVITY_LOG_REPOSITORY,
  type ActivityLogRepository,
} from './domain/ports/activity-log.repository.js';
import { ActivityLogOrmEntity } from './infrastructure/persistence/entities/activity-log.orm-entity.js';
import { TypeOrmActivityLogRepository } from './infrastructure/repositories/typeorm-activity-log.repository.js';
import { ClientActivityController } from './presentation/client-activity.controller.js';

/**
 * Composition root of the activity log (HU-16), read side: the history of a
 * client. The write side (shared ACTIVITY_LOG port) is ActivityLogWriterModule.
 *
 * Uses CLIENT_REPOSITORY and ADVISOR_CLIENT_ACCESS of ClientsModule (HU-03):
 * the client must exist and an advisor only sees the clients on their routes.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLogOrmEntity]),
    AuthModule,
    ClientsModule,
  ],
  controllers: [ClientActivityController],
  providers: [
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: TypeOrmActivityLogRepository,
    },
    {
      provide: GetClientActivityUseCase,
      inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS, ACTIVITY_LOG_REPOSITORY],
      useFactory: (
        clients: ClientRepository,
        advisorAccess: AdvisorClientAccessPort,
        activityLog: ActivityLogRepository,
      ) => new GetClientActivityUseCase(clients, advisorAccess, activityLog),
    },
  ],
})
export class ActivityLogModule {}
