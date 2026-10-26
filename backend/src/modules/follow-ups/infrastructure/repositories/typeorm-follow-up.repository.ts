import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PageRequest } from '../../../../shared/application/pagination.js';
import { pageOffset } from '../../../../shared/application/pagination.js';
import { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpFilterOptions, FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import { FollowUpMapper } from '../mappers/follow-up.mapper.js';
import { FollowUpOrmEntity } from '../persistence/entities/follow-up.orm-entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

@Injectable()
export class TypeOrmFollowUpRepository implements FollowUpRepository {
  constructor(
    @InjectRepository(FollowUpOrmEntity)
    private readonly repository: Repository<FollowUpOrmEntity>,
  ) {}

  async findById(id: number): Promise<FollowUp | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FollowUpMapper.toDomain(entity) : null;
  }

  async findPage(
    filter: FollowUpFilterOptions,
    page: PageRequest,
    actor: { role: string; advisorId?: number; userId?: string },
  ): Promise<{ items: FollowUp[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('fu')
      .orderBy('fu.nextDate', 'ASC')
      .addOrderBy('fu.id', 'ASC')
      .skip(pageOffset(page))
      .take(page.limit);

    // Role restrictions
    if (actor.role === UserRole.Advisor) {
      // advisor sees only their own follow-ups; need to resolve advisorId if not passed
      if (actor.advisorId !== undefined) {
        qb.andWhere('fu.responsibleAdvisorId = :advisorId', { advisorId: actor.advisorId });
      } else if (actor.userId) {
        qb.innerJoin('fu.responsibleAdvisor', 'adv').andWhere('adv.userId = :userId', { userId: actor.userId });
      } else {
        qb.andWhere('1 = 0');
      }
    }
    // admin/director see all unless filtered

    if (filter.advisorId !== undefined && actor.role !== UserRole.Advisor) {
      qb.andWhere('fu.responsibleAdvisorId = :advisorId', { advisorId: filter.advisorId });
    }
    if (filter.from) {
      qb.andWhere('fu.nextDate >= :from', { from: filter.from });
    }
    if (filter.to) {
      qb.andWhere('fu.nextDate <= :to', { to: filter.to });
    }

    // status filter
    if (filter.status === 'completed') {
      qb.andWhere('fu.completed = :c', { c: true });
    } else if (filter.status === 'pending') {
      const today = new Date().toISOString().slice(0, 10);
      qb.andWhere('fu.completed = :c', { c: false }).andWhere('fu.nextDate >= :today', { today });
    } else if (filter.status === 'overdue') {
      const today = new Date().toISOString().slice(0, 10);
      qb.andWhere('fu.completed = :c', { c: false }).andWhere('fu.nextDate < :today', { today });
    }

    const [entities, total] = await qb.getManyAndCount();
    return { items: entities.map((e) => FollowUpMapper.toDomain(e)), total };
  }

  async save(followUp: FollowUp): Promise<FollowUp> {
    const entity = FollowUpMapper.toPersistence(followUp);
    const saved = await this.repository.save(entity);
    return FollowUpMapper.toDomain(saved);
  }

  async update(followUp: FollowUp): Promise<FollowUp> {
    const entity = FollowUpMapper.toPersistence(followUp);
    const saved = await this.repository.save(entity);
    return FollowUpMapper.toDomain(saved);
  }
}
