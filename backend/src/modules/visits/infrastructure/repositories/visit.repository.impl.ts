import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { PageRequest } from '../../../../shared/application/pagination.js';
import { pageOffset } from '../../../../shared/application/pagination.js';
import type { VisitAgendaEntry } from '../../domain/visit-agenda-entry.js';
import { VisitStatus } from '../../domain/visit-status.js';
import { Visit } from '../../domain/visit.js';
import type {
  VisitFilterOptions,
  VisitRepository,
} from '../../domain/visit.repository.js';
import { VisitMapper } from '../mappers/visit.mapper.js';
import { VisitOrmEntity } from '../persistence/entities/visit.orm-entity.js';

interface AgendaRow {
  id: number;
  route_id: number | null;
  scheduled_date: Date;
  visit_order: number | null;
  actual_date: Date | null;
  status: VisitStatus;
  client_id: number;
  business_name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_mobile: string | null;
  contact_email: string | null;
  potential_id: number | null;
  potential_name: string | null;
}

@Injectable()
export class TypeOrmVisitRepository implements VisitRepository {
  constructor(
    @InjectRepository(VisitOrmEntity)
    private readonly visitRepository: Repository<VisitOrmEntity>,
  ) {}

  async findById(id: number): Promise<Visit | null> {
    const entity = await this.visitRepository.findOne({ where: { id } });
    return entity ? VisitMapper.toDomain(entity) : null;
  }

  async isAssignedToAdvisorUser(
    visitId: number,
    userId: string,
  ): Promise<boolean> {
    return this.visitRepository.exists({
      where: { id: visitId, advisor: { userId } },
    });
  }

  async findPage(
    filter: VisitFilterOptions,
    page: PageRequest,
  ): Promise<{ items: Visit[]; total: number }> {
    const qb = this.visitRepository
      .createQueryBuilder('visit')
      .orderBy('visit.scheduledDate', 'ASC')
      .addOrderBy('visit.visitOrder', 'ASC')
      .skip(pageOffset(page))
      .take(page.limit);

    if (filter.scheduledWithin) {
      qb.andWhere(
        'visit.scheduledDate >= :start AND visit.scheduledDate < :end',
        {
          start: filter.scheduledWithin.start,
          end: filter.scheduledWithin.end,
        },
      );
    }
    if (filter.advisorId !== undefined) {
      qb.andWhere('visit.advisorId = :advisorId', {
        advisorId: filter.advisorId,
      });
    }
    if (filter.advisorUserId !== undefined) {
      qb.innerJoin('visit.advisor', 'advisor').andWhere(
        'advisor.userId = :advisorUserId',
        { advisorUserId: filter.advisorUserId },
      );
    }
    if (filter.zoneId !== undefined) {
      qb.innerJoin('visit.client', 'client').andWhere(
        'client.zoneId = :zoneId',
        { zoneId: filter.zoneId },
      );
    }
    if (filter.status !== undefined) {
      qb.andWhere('visit.status = :status', { status: filter.status });
    }

    const [entities, total] = await qb.getManyAndCount();
    return { items: entities.map((entity) => VisitMapper.toDomain(entity)), total };
  }

  async findAgenda(
    userId: string,
    range: { start: Date; end: Date },
  ): Promise<VisitAgendaEntry[]> {
    const rows: AgendaRow[] = await this.visitRepository.manager.query(
      `SELECT
          v."id",
          v."route_id",
          v."scheduled_date",
          v."visit_order",
          v."actual_date",
          v."status",
          c."id" AS client_id,
          c."business_name",
          c."address",
          contact."name" AS contact_name,
          contact."phone" AS contact_phone,
          contact."mobile" AS contact_mobile,
          contact."email" AS contact_email,
          potential."id" AS potential_id,
          potential."name" AS potential_name
        FROM "visit" v
        JOIN "advisor" a ON a."id" = v."advisor_id"
        JOIN "client" c ON c."id" = v."client_id"
        LEFT JOIN "contact" contact
          ON contact."client_id" = c."id"
         AND contact."is_primary" = true
         AND contact."active" = true
        LEFT JOIN "client_potential" potential
          ON potential."id" = c."client_potential_id"
       WHERE a."user_id" = $1
         AND v."scheduled_date" >= $2
         AND v."scheduled_date" < $3
       ORDER BY v."scheduled_date" ASC, v."visit_order" ASC`,
      [userId, range.start, range.end],
    );

    return rows.map((row) => ({
      id: row.id,
      routeId: row.route_id,
      scheduledDate: row.scheduled_date,
      visitOrder: row.visit_order,
      actualDate: row.actual_date,
      status: row.status,
      client: {
        id: row.client_id,
        businessName: row.business_name,
        address: row.address,
      },
      primaryContact: row.contact_name
        ? {
            name: row.contact_name,
            phone: row.contact_phone,
            mobile: row.contact_mobile,
            email: row.contact_email,
          }
        : null,
      potential: row.potential_id
        ? { id: row.potential_id, name: row.potential_name! }
        : null,
    }));
  }

  async findClientIdsWithScheduledVisit(
    clientIds: number[],
    range: { start: Date; end: Date },
  ): Promise<number[]> {
    if (clientIds.length === 0) return [];
    const rows = await this.visitRepository
      .createQueryBuilder('visit')
      .select('DISTINCT visit.clientId', 'clientId')
      .where('visit.clientId IN (:...clientIds)', { clientIds })
      .andWhere('visit.status = :status', { status: VisitStatus.Scheduled })
      .andWhere('visit.scheduledDate >= :start AND visit.scheduledDate < :end', {
        start: range.start,
        end: range.end,
      })
      .getRawMany<{ clientId: number }>();
    return rows.map((row) => row.clientId);
  }

  async save(visit: Visit): Promise<Visit> {
    const entity = VisitMapper.toPersistence(visit);
    const saved = await this.visitRepository.save(entity);
    return VisitMapper.toDomain(saved);
  }

  async saveAll(visits: Visit[]): Promise<Visit[]> {
    return this.visitRepository.manager.transaction(async (manager) => {
      const entities = visits.map((visit) => VisitMapper.toPersistence(visit));
      const saved = await manager.save(VisitOrmEntity, entities);
      return saved.map((entity) => VisitMapper.toDomain(entity));
    });
  }

  async updateIfStatus(
    visit: Visit,
    expected: VisitStatus,
  ): Promise<Visit | null> {
    const result = await this.visitRepository
      .createQueryBuilder()
      .update(VisitOrmEntity)
      .set({
        scheduledDate: visit.scheduledDate,
        status: visit.status,
      })
      .where('id = :id AND status = :expected', {
        id: visit.id,
        expected,
      })
      .execute();

    if (result.affected !== 1) {
      return null;
    }
    // The update does not return the row in a portable shape, so it is
    // re-read to answer the same entity another request would see.
    return this.findById(visit.id!);
  }
}
