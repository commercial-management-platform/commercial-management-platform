import { Route } from '../../domain/route.js';
import { RouteClient } from '../../domain/route-client.js';
import { RouteOrmEntity } from '../persistence/entities/route.orm-entity.js';
import { RouteClientOrmEntity } from '../persistence/entities/route-client.orm-entity.js';

export class RouteMapper {
  static toDomain(entity: RouteOrmEntity): Route {
    return new Route(
      entity.id,
      entity.name,
      entity.zoneId,
      entity.executionDays,
      entity.frequency,
      entity.suggestedStartTime,
      entity.suggestedEndTime,
      entity.description,
      entity.advisorId,
      entity.startDate,
      entity.endDate,
      entity.status,
    );
  }

  static toPersistence(route: Route): RouteOrmEntity {
    const entity = new RouteOrmEntity();
    if (route.id !== null) {
      entity.id = route.id;
    }
    entity.name = route.name;
    entity.zoneId = route.zoneId;
    entity.executionDays = route.executionDays;
    entity.frequency = route.frequency;
    entity.suggestedStartTime = route.suggestedStartTime;
    entity.suggestedEndTime = route.suggestedEndTime;
    entity.description = route.description;
    entity.advisorId = route.advisorId;
    entity.startDate = route.startDate;
    entity.endDate = route.endDate;
    entity.status = route.status;
    return entity;
  }

  static clientToDomain(entity: RouteClientOrmEntity): RouteClient {
    return new RouteClient(entity.id, entity.routeId, entity.clientId, entity.visitOrder);
  }
}
