import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  pageOffset,
  type PageRequest,
} from '../../../../shared/application/pagination.js';
import type { ActivityAction } from '../../../../shared/domain/activity-log/activity-action.js';
import { ActivityLogRecord } from '../../domain/entities/activity-log-record.js';
import type {
  ActivityLogFilter,
  ActivityLogRepository,
} from '../../domain/ports/activity-log.repository.js';
import { ActivityLogOrmEntity } from '../persistence/entities/activity-log.orm-entity.js';

@Injectable()
export class TypeOrmActivityLogRepository implements ActivityLogRepository {
  constructor(
    @InjectRepository(ActivityLogOrmEntity)
    private readonly repository: Repository<ActivityLogOrmEntity>,
  ) {}

  async findPageByClient(
    clientId: number,
    filter: ActivityLogFilter,
    page: PageRequest,
  ): Promise<{ items: ActivityLogRecord[]; total: number }> {
    // The join is many-to-one (one user per entry), so offset/limit are
    // exact; skip/take would add a DISTINCT subquery for nothing.
    const qb = this.repository
      .createQueryBuilder('log')
      .leftJoin('log.user', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('log.clientId = :clientId', { clientId })
      .orderBy('log.createdAt', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .offset(pageOffset(page))
      .limit(page.limit);

    if (filter.action !== undefined) {
      qb.andWhere('log.action = :action', { action: filter.action });
    }
    if (filter.from !== undefined) {
      qb.andWhere('log.createdAt >= :from', { from: filter.from });
    }
    if (filter.to !== undefined) {
      qb.andWhere('log.createdAt < :to', { to: filter.to });
    }

    const [entities, total] = await qb.getManyAndCount();
    return { items: entities.map(toDomain), total };
  }
}

function toDomain(entity: ActivityLogOrmEntity): ActivityLogRecord {
  return new ActivityLogRecord({
    id: entity.id,
    clientId: entity.clientId,
    // Stored values always come from ACTIVITY_ACTIONS (written through the port).
    action: entity.action as ActivityAction,
    userId: entity.userId,
    userName: entity.user?.name ?? null,
    description: entity.description,
    createdAt: entity.createdAt,
  });
}
