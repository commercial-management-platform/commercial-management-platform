import { NotFoundError } from '../../../shared/domain/errors/index.js';

import type { RouteRepository } from '../domain/route.repository.js';
import { Route } from '../domain/route.js';

export class UpdateRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(
    id: number,
    input: {
      name?: string;
      zoneId?: number;
      executionDays?: string | null;
      frequency?: string | null;
      suggestedStartTime?: string | null;
      suggestedEndTime?: string | null;
      description?: string | null;
      advisorId?: number;
      startDate?: Date;
      endDate?: Date | null;
      status?: string;
    },
  ): Promise<Route> {
    const existing = await this.routeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Route not found');
    }
    const updated = new Route(
      existing.id,
      input.name ?? existing.name,
      input.zoneId ?? existing.zoneId,
      input.executionDays === undefined ? existing.executionDays : input.executionDays,
      input.frequency === undefined ? existing.frequency : input.frequency,
      input.suggestedStartTime === undefined ? existing.suggestedStartTime : input.suggestedStartTime,
      input.suggestedEndTime === undefined ? existing.suggestedEndTime : input.suggestedEndTime,
      input.description === undefined ? existing.description : input.description,
      input.advisorId ?? existing.advisorId,
      input.startDate ?? existing.startDate,
      input.endDate === undefined ? existing.endDate : input.endDate,
      input.status ?? existing.status,
    );
    return this.routeRepository.update(updated);
  }
}
