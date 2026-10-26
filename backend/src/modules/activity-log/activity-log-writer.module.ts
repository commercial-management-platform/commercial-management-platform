import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ACTIVITY_LOG } from '../../shared/application/ports/activity-log.port.js';
import { TypeOrmActivityLogAdapter } from './infrastructure/adapters/typeorm-activity-log.adapter.js';
import { ActivityLogOrmEntity } from './infrastructure/persistence/entities/activity-log.orm-entity.js';

/**
 * Write side of the activity log (HU-16): binds the shared ACTIVITY_LOG port
 * to its TypeORM adapter. Import it in any module that records actions.
 *
 * Kept apart from ActivityLogModule, which reads the history and depends on
 * ClientsModule: ClientsModule imports this one, so a single module would be
 * a circular import.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLogOrmEntity])],
  providers: [{ provide: ACTIVITY_LOG, useClass: TypeOrmActivityLogAdapter }],
  exports: [ACTIVITY_LOG],
})
export class ActivityLogWriterModule {}
