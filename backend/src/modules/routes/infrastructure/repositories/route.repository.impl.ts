import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { ConflictError } from '../../../../shared/domain/errors/index.js';

import { Route } from '../../domain/route.js';
import { RouteClient } from '../../domain/route-client.js';
import {
  type RouteRepository,
  type VisitOrderItem,
} from '../../domain/route.repository.js';
import { RouteMapper } from '../mappers/route.mapper.js';
import { RouteOrmEntity } from '../persistence/entities/route.orm-entity.js';
import { RouteClientOrmEntity } from '../persistence/entities/route-client.orm-entity.js';

@Injectable()
export class TypeOrmRouteRepository implements RouteRepository {
  constructor(
    @InjectRepository(RouteOrmEntity)
    private readonly routeRepository: Repository<RouteOrmEntity>,
    @InjectRepository(RouteClientOrmEntity)
    private readonly routeClientRepository: Repository<RouteClientOrmEntity>,
  ) {}

  async findAll(): Promise<Route[]> {
    const entities = await this.routeRepository.find();
    return entities.map((entity) => RouteMapper.toDomain(entity));
  }

  async findById(id: number): Promise<Route | null> {
    const entity = await this.routeRepository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return RouteMapper.toDomain(entity);
  }

  async save(route: Route): Promise<Route> {
    const entity = RouteMapper.toPersistence(route);
    const saved = await this.routeRepository.save(entity);
    return RouteMapper.toDomain(saved);
  }

  async update(route: Route): Promise<Route> {
    const entity = RouteMapper.toPersistence(route);
    const saved = await this.routeRepository.save(entity);
    return RouteMapper.toDomain(saved);
  }

  async findClients(routeId: number): Promise<RouteClient[]> {
    const entities = await this.routeClientRepository.find({
      where: { routeId },
      order: { visitOrder: 'ASC' },
    });
    return entities.map((entity) => RouteMapper.clientToDomain(entity));
  }

  async findAssociation(
    routeId: number,
    clientId: number,
  ): Promise<RouteClient | null> {
    const entity = await this.routeClientRepository.findOne({
      where: { routeId, clientId },
    });
    if (!entity) {
      return null;
    }
    return RouteMapper.clientToDomain(entity);
  }

  async associate(
    routeId: number,
    clientId: number,
    visitOrder: number,
  ): Promise<RouteClient> {
    const entity = new RouteClientOrmEntity();
    entity.routeId = routeId;
    entity.clientId = clientId;
    entity.visitOrder = visitOrder;
    try {
      const saved = await this.routeClientRepository.save(entity);
      return RouteMapper.clientToDomain(saved);
    } catch (error) {
      // Two concurrent requests can pass the use case checks at the same time;
      // the unique constraints are the last word.
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          'Client already associated or visit order taken, try again',
        );
      }
      throw error;
    }
  }

  async removeAssociation(routeId: number, clientId: number): Promise<void> {
    await this.routeClientRepository.delete({ routeId, clientId });
  }

  async reorder(routeId: number, items: VisitOrderItem[]): Promise<void> {
    // All or nothing: a failure halfway must not leave a mixed order.
    await this.routeClientRepository.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(
          RouteClientOrmEntity,
          { routeId, clientId: item.clientId },
          { visitOrder: item.visitOrder },
        );
      }
    });
  }
}

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}
