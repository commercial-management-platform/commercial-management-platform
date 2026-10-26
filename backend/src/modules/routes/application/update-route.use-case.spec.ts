import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import type { CatalogLookupPort } from '../../catalogs/application/ports/catalog-lookup.port.js';
import { RouteStatus } from '../domain/route-status.js';
import { Route } from '../domain/route.js';
import type { RouteRepository } from '../domain/route.repository.js';
import type { AdvisorLookupPort } from './ports/advisor-lookup.port.js';
import { UpdateRouteUseCase } from './update-route.use-case.js';

// Zone 1 and advisor 2 are assigned to the route.
const route = new Route(
  1,
  'RUT-001',
  1,
  null,
  null,
  null,
  null,
  null,
  2,
  '2026-01-01',
  null,
  RouteStatus.Active,
);

function setup() {
  const routeRepository = {
    findById: vi.fn().mockResolvedValue(route),
    update: vi.fn(async (updated: Route) => updated),
  };
  const catalogs = { isActive: vi.fn().mockResolvedValue(true) };
  const advisors = { isActive: vi.fn().mockResolvedValue(true) };
  const useCase = new UpdateRouteUseCase(
    routeRepository as unknown as RouteRepository,
    catalogs as CatalogLookupPort,
    advisors as AdvisorLookupPort,
  );
  return { routeRepository, catalogs, advisors, useCase };
}

describe('UpdateRouteUseCase', () => {
  it('fails when the route does not exist', async () => {
    const { routeRepository, useCase } = setup();
    routeRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(1, { name: 'X' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('keeps the assigned zone and advisor even if they are now inactive', async () => {
    const { routeRepository, catalogs, advisors, useCase } = setup();
    catalogs.isActive.mockResolvedValue(false);
    advisors.isActive.mockResolvedValue(false);

    const updated = await useCase.execute(1, { description: 'updated' });

    expect(catalogs.isActive).not.toHaveBeenCalled();
    expect(advisors.isActive).not.toHaveBeenCalled();
    expect(routeRepository.update).toHaveBeenCalledOnce();
    expect(updated).toMatchObject({ zoneId: 1, advisorId: 2 });
  });

  it('does not check the same zone and advisor sent again', async () => {
    const { catalogs, advisors, useCase } = setup();
    catalogs.isActive.mockResolvedValue(false);
    advisors.isActive.mockResolvedValue(false);

    await useCase.execute(1, { zoneId: 1, advisorId: 2 });

    expect(catalogs.isActive).not.toHaveBeenCalled();
    expect(advisors.isActive).not.toHaveBeenCalled();
  });

  it('accepts a new active zone and advisor', async () => {
    const { catalogs, advisors, useCase } = setup();

    const updated = await useCase.execute(1, { zoneId: 3, advisorId: 4 });

    expect(catalogs.isActive).toHaveBeenCalledWith('zone', 3);
    expect(advisors.isActive).toHaveBeenCalledWith(4);
    expect(updated).toMatchObject({ zoneId: 3, advisorId: 4 });
  });

  it('rejects a new zone that does not exist or is inactive', async () => {
    const { routeRepository, catalogs, useCase } = setup();
    catalogs.isActive.mockResolvedValue(false);

    await expect(useCase.execute(1, { zoneId: 3 })).rejects.toThrow(
      new ValidationError("Unknown or inactive zone id '3'"),
    );
    expect(routeRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a new advisor that does not exist or is inactive', async () => {
    const { routeRepository, advisors, useCase } = setup();
    advisors.isActive.mockResolvedValue(false);

    await expect(useCase.execute(1, { advisorId: 4 })).rejects.toThrow(
      new ValidationError("Unknown or inactive advisor id '4'"),
    );
    expect(routeRepository.update).not.toHaveBeenCalled();
  });
});
