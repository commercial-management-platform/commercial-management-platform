import { describe, expect, it, vi } from 'vitest';

import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { Client, type ClientProps } from '../../clients/domain/entities/client.js';
import { AssociateClientUseCase } from '../application/use-cases/associate-client.use-case.js';
import { GetPortfolioClientsUseCase } from '../application/use-cases/get-portfolio-clients.use-case.js';
import { GetPortfolioUseCase } from '../application/use-cases/get-portfolio.use-case.js';
import { RemoveClientUseCase } from '../application/use-cases/remove-client.use-case.js';
import { PortfoliosController } from './portfolios.controller.js';

describe('PortfoliosController', () => {
  const adminUser = new AuthUser({
    id: 'usr_admin_1',
    email: 'admin@cmp.com',
    name: 'Admin User',
    role: UserRole.Admin,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const advisorUser = new AuthUser({
    id: 'usr_advisor_1',
    email: 'advisor@cmp.com',
    name: 'Advisor User',
    role: UserRole.Advisor,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const clientProps: ClientProps = {
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
  };

  function createController() {
    const get = {
      execute: vi.fn().mockResolvedValue({
        id: 3,
        name: 'Portafolio Andino',
        active: true,
        description: 'Clientes del sector andino',
      }),
    };
    const list = {
      execute: vi.fn().mockResolvedValue([new Client(clientProps)]),
    };
    const associate = { execute: vi.fn().mockResolvedValue(undefined) };
    const remove = { execute: vi.fn().mockResolvedValue(undefined) };

    const controller = new PortfoliosController(
      get as unknown as GetPortfolioUseCase,
      list as unknown as GetPortfolioClientsUseCase,
      associate as unknown as AssociateClientUseCase,
      remove as unknown as RemoveClientUseCase,
    );

    return { controller, get, list, associate, remove };
  }

  it('getById returns the portfolio', async () => {
    const { controller, get } = createController();

    const result = await controller.getById(3);

    expect(get.execute).toHaveBeenCalledWith(3);
    expect(result).toMatchObject({
      id: 3,
      name: 'Portafolio Andino',
      active: true,
      description: 'Clientes del sector andino',
    });
  });

  it('listClients maps every client to a client response', async () => {
    const { controller, list } = createController();

    const result = await controller.listClients(3, adminUser);

    expect(list.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      portfolioId: 3,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(7);
    expect(result[0].businessName).toBe('Distribuidora Andina SAS');
  });

  it('listClients forwards the advisor so the visibility can be applied', async () => {
    const { controller, list } = createController();

    await controller.listClients(3, advisorUser);

    expect(list.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
      portfolioId: 3,
    });
  });

  it('associate forwards the ids and the actor', async () => {
    const { controller, associate } = createController();

    const result = await controller.associate(3, 7, adminUser);

    expect(associate.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      portfolioId: 3,
      clientId: 7,
    });
    expect(result).toEqual({ success: true });
  });

  it('remove forwards the ids and the actor', async () => {
    const { controller, remove } = createController();

    const result = await controller.remove(3, 7, adminUser);

    expect(remove.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      portfolioId: 3,
      clientId: 7,
    });
    expect(result).toEqual({ success: true });
  });
});
