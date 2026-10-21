import { ValidationError } from '../../../shared/domain/errors/index.js';
import type { CatalogLookupPort } from '../../catalogs/application/ports/catalog-lookup.port.js';
import { RouteStatus } from '../domain/route-status.js';
import type { Route } from '../domain/route.js';
import type { RouteRepository } from '../domain/route.repository.js';
import { CreateRouteUseCase } from './create-route.use-case.js';
import type { AdvisorLookupPort } from './ports/advisor-lookup.port.js';

const input = {
  name: 'RUT-001',
  zoneId: 1,
  advisorId: 2,
  startDate: '2026-01-01',
};

function setup() {
  const routeRepository = {
    save: vi.fn(async (route: Route) => route),
  };
  const catalogs = { isActive: vi.fn().mockResolvedValue(true) };
  const advisors = { isActive: vi.fn().mockResolvedValue(true) };
  const useCase = new CreateRouteUseCase(
    routeRepository as unknown as RouteRepository,
    catalogs as CatalogLookupPort,
    advisors as AdvisorLookupPort,
  );
  return { routeRepository, catalogs, advisors, useCase };
}

describe('CreateRouteUseCase', () => {
  it('saves the route when the zone and the advisor are active', async () => {
    const { routeRepository, catalogs, advisors, useCase } = setup();

    const route = await useCase.execute(input);

    expect(catalogs.isActive).toHaveBeenCalledWith('zone', 1);
    expect(advisors.isActive).toHaveBeenCalledWith(2);
    expect(routeRepository.save).toHaveBeenCalledOnce();
    expect(route).toMatchObject({ zoneId: 1, status: RouteStatus.Active });
  });

  it('rejects a zone that does not exist or is inactive', async () => {
    const { routeRepository, catalogs, useCase } = setup();
    catalogs.isActive.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(
      new ValidationError("Unknown or inactive zone id '1'"),
    );
    expect(routeRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an advisor that does not exist or is inactive', async () => {
    const { routeRepository, advisors, useCase } = setup();
    advisors.isActive.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(
      new ValidationError("Unknown or inactive advisor id '2'"),
    );
    expect(routeRepository.save).not.toHaveBeenCalled();
  });
});
