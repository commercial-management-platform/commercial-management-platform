import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import { Client } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../ports/advisor-client-access.port.js';
import { GetClientByIdUseCase } from './get-client-by-id.use-case.js';

describe('GetClientByIdUseCase', () => {
  const client = new Client({
    id: 7,
    nit: '900123456-5',
    businessName: 'Distribuidora Andina SAS',
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
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  function createRepositoryFixture(found: Client | null): ClientRepository {
    return {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(found),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };
  }

  function createAccessFixture(canAccess: boolean): AdvisorClientAccessPort {
    return {
      canAccess: vi.fn().mockResolvedValue(canAccess),
      getAccessibleClientIds: vi.fn().mockResolvedValue([]),
    };
  }

  it('returns an existing client for an admin without visibility checks', async () => {
    const repository = createRepositoryFixture(client);
    const access = createAccessFixture(false);
    const useCase = new GetClientByIdUseCase(repository, access);

    const result = await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
    });

    expect(result.nit).toBe('900123456-5');
    expect(access.canAccess).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const useCase = new GetClientByIdUseCase(
      createRepositoryFixture(null),
      createAccessFixture(true),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 404,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('lets an advisor read a client on their routes', async () => {
    const access = createAccessFixture(true);
    const useCase = new GetClientByIdUseCase(
      createRepositoryFixture(client),
      access,
    );

    const result = await useCase.execute({
      actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
      clientId: 7,
    });

    expect(result.id).toBe(7);
    expect(access.canAccess).toHaveBeenCalledWith('usr_advisor_1', 7);
  });

  it('answers NotFoundError to an advisor for a client outside their routes', async () => {
    const access = createAccessFixture(false);
    const useCase = new GetClientByIdUseCase(
      createRepositoryFixture(client),
      access,
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
        clientId: 7,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
