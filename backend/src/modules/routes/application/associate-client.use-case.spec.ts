import {
  ConflictError,
  NotFoundError,
} from '../../../shared/domain/errors/index.js';
import { Client } from '../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../clients/domain/repositories/client.repository.js';
import { RouteClient } from '../domain/route-client.js';
import { RouteStatus } from '../domain/route-status.js';
import { Route } from '../domain/route.js';
import type { RouteRepository } from '../domain/route.repository.js';
import { AssociateClientUseCase } from './associate-client.use-case.js';

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
    findAssociation: vi.fn().mockResolvedValue(null),
    findClients: vi.fn().mockResolvedValue([]),
    associate: vi.fn(),
  };
  const clientRepository = {
    findById: vi.fn().mockResolvedValue(
      new Client({
        id: 7,
        nit: '900000007-1',
        businessName: 'Client',
        tradeName: null,
        address: null,
        department: null,
        municipality: null,
        neighborhood: null,
        phone: null,
        email: null,
        zoneId: null,
        clientTypeId: null,
        clientPotentialId: null,
        clientStatusId: null,
        visitFrequencyDays: null,
        latitude: null,
        longitude: null,
        active: true,
        createdAt: null,
        updatedAt: null,
      }),
    ),
  };
  const useCase = new AssociateClientUseCase(
    routeRepository as unknown as RouteRepository,
    clientRepository as unknown as ClientRepository,
  );
  return { routeRepository, clientRepository, useCase };
}

describe('AssociateClientUseCase', () => {
  it('appends the client at the end of the visit order', async () => {
    const { routeRepository, useCase } = setup();
    routeRepository.findClients.mockResolvedValue([
      new RouteClient(10, 1, 3, 1),
      new RouteClient(11, 1, 4, 2),
    ]);

    await useCase.execute(1, 7);

    expect(routeRepository.associate).toHaveBeenCalledWith(1, 7, 3);
  });

  it('starts the order at 1 on an empty route', async () => {
    const { routeRepository, useCase } = setup();

    await useCase.execute(1, 7);

    expect(routeRepository.associate).toHaveBeenCalledWith(1, 7, 1);
  });

  it('fails when the route does not exist', async () => {
    const { routeRepository, useCase } = setup();
    routeRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(1, 7)).rejects.toThrow(NotFoundError);
  });

  it('fails when the client does not exist', async () => {
    const { clientRepository, useCase } = setup();
    clientRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(1, 7)).rejects.toThrow(NotFoundError);
  });

  it('fails when the client is already on the route', async () => {
    const { routeRepository, useCase } = setup();
    routeRepository.findAssociation.mockResolvedValue(
      new RouteClient(10, 1, 7, 1),
    );

    await expect(useCase.execute(1, 7)).rejects.toThrow(ConflictError);
    expect(routeRepository.associate).not.toHaveBeenCalled();
  });
});
