import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import { RouteClient } from '../domain/route-client.js';
import { RouteStatus } from '../domain/route-status.js';
import { Route } from '../domain/route.js';
import type { RouteRepository } from '../domain/route.repository.js';
import { ReorderClientsUseCase } from './reorder-clients.use-case.js';

const route = new Route(
  1,
  'RUT-001',
  1,
  null,
  null,
  null,
  null,
  null,
  1,
  '2026-01-01',
  null,
  RouteStatus.Active,
);

function setup() {
  const routeRepository = {
    findById: vi.fn().mockResolvedValue(route),
    findClients: vi
      .fn()
      .mockResolvedValue([
        new RouteClient(10, 1, 3, 1),
        new RouteClient(11, 1, 4, 2),
      ]),
    reorder: vi.fn(),
  };
  const useCase = new ReorderClientsUseCase(
    routeRepository as unknown as RouteRepository,
  );
  return { routeRepository, useCase };
}

describe('ReorderClientsUseCase', () => {
  it('saves the visitOrder values that were sent', async () => {
    const { routeRepository, useCase } = setup();
    const items = [
      { clientId: 4, visitOrder: 5 },
      { clientId: 3, visitOrder: 8 },
    ];

    await useCase.execute(1, items);

    expect(routeRepository.reorder).toHaveBeenCalledWith(1, items);
  });

  it('fails when the route does not exist', async () => {
    const { routeRepository, useCase } = setup();
    routeRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(1, [])).rejects.toThrow(NotFoundError);
  });

  it.each([
    [
      'a client that is not on the route',
      [
        { clientId: 3, visitOrder: 1 },
        { clientId: 99, visitOrder: 2 },
      ],
    ],
    ['a missing client', [{ clientId: 3, visitOrder: 1 }]],
    [
      'a repeated client',
      [
        { clientId: 3, visitOrder: 1 },
        { clientId: 3, visitOrder: 2 },
      ],
    ],
    [
      'a repeated visitOrder',
      [
        { clientId: 3, visitOrder: 1 },
        { clientId: 4, visitOrder: 1 },
      ],
    ],
  ])('rejects %s', async (_case, items) => {
    const { routeRepository, useCase } = setup();

    await expect(useCase.execute(1, items)).rejects.toThrow(ValidationError);
    expect(routeRepository.reorder).not.toHaveBeenCalled();
  });
});
