import { Visit } from '../../domain/visit.js';
import { VisitOrmEntity } from '../persistence/entities/visit.orm-entity.js';

export class VisitMapper {
  static toDomain(entity: VisitOrmEntity): Visit {
    return new Visit({
      id: entity.id,
      clientId: entity.clientId,
      advisorId: entity.advisorId,
      routeId: entity.routeId,
      scheduledDate: entity.scheduledDate,
      visitOrder: entity.visitOrder,
      actualDate: entity.actualDate,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(visit: Visit): VisitOrmEntity {
    const entity = new VisitOrmEntity();
    if (visit.id !== null) {
      entity.id = visit.id;
    }
    entity.clientId = visit.clientId;
    entity.advisorId = visit.advisorId;
    entity.routeId = visit.routeId;
    entity.scheduledDate = visit.scheduledDate;
    entity.visitOrder = visit.visitOrder;
    entity.actualDate = visit.actualDate;
    entity.status = visit.status;
    return entity;
  }
}
