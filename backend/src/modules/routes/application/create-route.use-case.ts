import type { RouteRepository } from '../domain/route.repository.js';
import { Route } from '../domain/route.js';
import { RouteStatus } from '../domain/route-status.js';

export class CreateRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(input: {
    name: string;
    zoneId: number;
    executionDays?: string | null;
    frequency?: string | null;
    suggestedStartTime?: string | null;
    suggestedEndTime?: string | null;
    description?: string | null;
    advisorId: number;
    startDate: string;
    endDate?: string | null;
    status?: RouteStatus;
  }): Promise<Route> {
    const route = new Route(
      null,
      input.name,
      input.zoneId,
      input.executionDays ?? null,
      input.frequency ?? null,
      input.suggestedStartTime ?? null,
      input.suggestedEndTime ?? null,
      input.description ?? null,
      input.advisorId,
      input.startDate,
      input.endDate ?? null,
      input.status ?? RouteStatus.Active,
    );
    return this.routeRepository.save(route);
  }
}
