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
      startedAt: entity.startedAt,
      finishedAt: entity.finishedAt,
      checkInLatitude: entity.checkInLatitude,
      checkInLongitude: entity.checkInLongitude,
      checkInDistanceMeters: entity.checkInDistanceMeters,
      locationConfirmed: entity.locationConfirmed,
      visitObjectiveId: entity.visitObjectiveId,
      visitTypeId: entity.visitTypeId,
      interestLevel: entity.interestLevel,
      interestReason: entity.interestReason,
      competitorMentioned: entity.competitorMentioned,
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
    entity.startedAt = visit.startedAt;
    entity.finishedAt = visit.finishedAt;
    entity.checkInLatitude = visit.checkInLatitude;
    entity.checkInLongitude = visit.checkInLongitude;
    entity.checkInDistanceMeters = visit.checkInDistanceMeters;
    entity.locationConfirmed = visit.locationConfirmed;
    entity.visitObjectiveId = visit.visitObjectiveId;
    entity.visitTypeId = visit.visitTypeId;
    entity.interestLevel = visit.interestLevel;
    entity.interestReason = visit.interestReason;
    entity.competitorMentioned = visit.competitorMentioned;
    return entity;
  }
}
