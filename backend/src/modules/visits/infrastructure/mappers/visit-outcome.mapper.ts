import { VisitOutcome } from '../../domain/visit-outcome.js';
import { VisitOutcomeOrmEntity } from '../persistence/entities/visit-outcome.orm-entity.js';

export class VisitOutcomeMapper {
  static toDomain(entity: VisitOutcomeOrmEntity): VisitOutcome {
    return new VisitOutcome({
      id: entity.id,
      visitId: entity.visitId,
      visitResultId: entity.visitResultId,
      observation: entity.observation,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(outcome: VisitOutcome): VisitOutcomeOrmEntity {
    const entity = new VisitOutcomeOrmEntity();
    if (outcome.id !== null) {
      entity.id = outcome.id;
    }
    entity.visitId = outcome.visitId;
    entity.visitResultId = outcome.visitResultId;
    entity.observation = outcome.observation;
    return entity;
  }
}
