import { FollowUp } from '../../domain/entities/follow-up.js';
import { FollowUpOrmEntity } from '../persistence/entities/follow-up.orm-entity.js';

export class FollowUpMapper {
  static toDomain(entity: FollowUpOrmEntity): FollowUp {
    return new FollowUp({
      id: entity.id,
      visitId: entity.visitId,
      nextDate: entity.nextDate,
      nextTime: entity.nextTime,
      activity: entity.activity,
      observation: entity.observation,
      responsibleAdvisorId: entity.responsibleAdvisorId,
      completed: entity.completed,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(followUp: FollowUp): FollowUpOrmEntity {
    const entity = new FollowUpOrmEntity();
    if (followUp.id !== null) {
      entity.id = followUp.id;
    }
    entity.visitId = followUp.visitId;
    entity.nextDate = followUp.nextDate;
    entity.nextTime = followUp.nextTime;
    entity.activity = followUp.activity;
    entity.observation = followUp.observation;
    entity.responsibleAdvisorId = followUp.responsibleAdvisorId;
    entity.completed = followUp.completed;
    entity.completedAt = followUp.completedAt;
    return entity;
  }
}
