import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
  ActivityLogEntry,
  ActivityLogPort,
} from '../../../../shared/application/ports/activity-log.port.js';
import { ActivityLogOrmEntity } from '../persistence/entities/activity-log.orm-entity.js';

/**
 * Writes the entries of the shared ActivityLogPort into activity_log. Only
 * inserts: the table rejects UPDATE and DELETE (trigger of the migration).
 */
@Injectable()
export class TypeOrmActivityLogAdapter implements ActivityLogPort {
  constructor(
    @InjectRepository(ActivityLogOrmEntity)
    private readonly repository: Repository<ActivityLogOrmEntity>,
  ) {}

  async record(entry: ActivityLogEntry): Promise<void> {
    await this.repository.insert({
      clientId: entry.clientId,
      action: entry.action,
      userId: entry.userId,
      description: entry.description,
      createdAt: entry.occurredAt,
    });
  }
}
