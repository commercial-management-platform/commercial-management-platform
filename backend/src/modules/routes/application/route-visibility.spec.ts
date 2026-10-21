import { NotFoundError } from '../../../shared/domain/errors/index.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { RouteClient } from '../domain/route-client.js';
import { RouteStatus } from '../domain/route-status.js';
import { Route } from '../domain/route.js';
import type { RouteRepository } from '../domain/route.repository.js';
import { GetRouteClientsUseCase } from './get-route-clients.use-case.js';
import { GetRouteUseCase } from './get-route.use-case.js';
import { ListRoutesUseCase } from './list-routes.use-case.js';

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

const director = { id: 'usr_director', role: UserRole.Director };
const advisor = { id: 'usr_advisor', role: UserRole.Advisor };

function setup() {
  const routeRepository = {
    findAll: vi.fn().mockResolvedValue([route]),
    findById: vi.fn().mockResolvedValue(route),
    isAssignedToAdvisorUser: vi.fn().mockResolvedValue(true),
    findClients: vi.fn().mockResolvedValue([new RouteClient(10, 1, 7, 1)]),
  };
  const repo = routeRepository as unknown as RouteRepository;
  return {
    routeRepository,
    list: new ListRoutesUseCase(repo),
    get: new GetRouteUseCase(repo),
    getClients: new GetRouteClientsUseCase(repo),
  };
}

describe('Route visibility by role', () => {
  it('lists every route for a director', async () => {
    const { routeRepository, list } = setup();

    await list.execute(director);

    expect(routeRepository.findAll).toHaveBeenCalledWith();
  });

  it('lists only the routes of the session advisor', async () => {
    const { routeRepository, list } = setup();

    await list.execute(advisor);

    expect(routeRepository.findAll).toHaveBeenCalledWith({
      advisorUserId: 'usr_advisor',
    });
  });

  it('lets a director read any route without checking assignment', async () => {
    const { routeRepository, get } = setup();

    await expect(get.execute(director, 1)).resolves.toBe(route);
    expect(routeRepository.isAssignedToAdvisorUser).not.toHaveBeenCalled();
  });

  it('lets an advisor read their own route and its clients', async () => {
    const { get, getClients } = setup();

    await expect(get.execute(advisor, 1)).resolves.toBe(route);
    await expect(getClients.execute(advisor, 1)).resolves.toHaveLength(1);
  });

  it('answers 404 to an advisor for a route of another advisor', async () => {
    const { routeRepository, get, getClients } = setup();
    routeRepository.isAssignedToAdvisorUser.mockResolvedValue(false);

    await expect(get.execute(advisor, 1)).rejects.toThrow(NotFoundError);
    await expect(getClients.execute(advisor, 1)).rejects.toThrow(NotFoundError);
    expect(routeRepository.isAssignedToAdvisorUser).toHaveBeenCalledWith(
      1,
      'usr_advisor',
    );
    expect(routeRepository.findClients).not.toHaveBeenCalled();
  });

  it('answers 404 when the route does not exist', async () => {
    const { routeRepository, get } = setup();
    routeRepository.findById.mockResolvedValue(null);

    await expect(get.execute(director, 99)).rejects.toThrow(NotFoundError);
  });
});
