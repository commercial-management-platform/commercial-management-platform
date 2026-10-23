import { describe, expect, it, vi } from 'vitest';

import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { Client } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import { ActivityLogRecord } from '../../domain/entities/activity-log-record.js';
import type { ActivityLogRepository } from '../../domain/ports/activity-log.repository.js';
import { GetClientActivityUseCase } from './get-client-activity.use-case.js';

const page = { page: 1, limit: 20 };
const admin = { id: 'usr-admin', role: UserRole.Admin };
const director = { id: 'usr-director', role: UserRole.Director };
const advisor = { id: 'usr-advisor', role: UserRole.Advisor };

const record = new ActivityLogRecord({
  id: 1,
  clientId: 10,
  action: 'client.updated',
  userId: 'usr-admin',
  userName: 'Admin',
  description: "Client 'Acme' updated",
  createdAt: new Date('2026-10-20T15:00:00Z'),
});

function setup(options: { clientExists?: boolean; advisorCanAccess?: boolean } = {}) {
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options.clientExists === false ? null : ({ id: 10 } as Client),
      ),
  } as unknown as ClientRepository;
  const canAccess = vi.fn().mockResolvedValue(options.advisorCanAccess ?? false);
  const advisorAccess: AdvisorClientAccessPort = {
    canAccess,
    getAccessibleClientIds: vi.fn(),
  };
  const findPageByClient = vi
    .fn()
    .mockResolvedValue({ items: [record], total: 1 });
  const activityLog: ActivityLogRepository = { findPageByClient };

  return {
    useCase: new GetClientActivityUseCase(clients, advisorAccess, activityLog),
    canAccess,
    findPageByClient,
  };
}

describe('GetClientActivityUseCase', () => {
  it.each([admin, director])(
    'returns the page of history of any client for $role',
    async (actor) => {
      const { useCase, canAccess, findPageByClient } = setup();

      const result = await useCase.execute({ actor, clientId: 10 }, page);

      expect(result).toEqual({ data: [record], total: 1, page: 1, limit: 20 });
      expect(canAccess).not.toHaveBeenCalled();
      expect(findPageByClient).toHaveBeenCalledWith(
        10,
        { action: undefined, from: undefined, to: undefined },
        page,
      );
    },
  );

  it('lets an advisor read the history of a client on their routes', async () => {
    const { useCase, canAccess } = setup({ advisorCanAccess: true });

    const result = await useCase.execute({ actor: advisor, clientId: 10 }, page);

    expect(result.total).toBe(1);
    expect(canAccess).toHaveBeenCalledWith('usr-advisor', 10);
  });

  it('answers 404 to an advisor for a client outside their routes', async () => {
    const { useCase, findPageByClient } = setup({ advisorCanAccess: false });

    await expect(
      useCase.execute({ actor: advisor, clientId: 10 }, page),
    ).rejects.toThrow(NotFoundError);
    expect(findPageByClient).not.toHaveBeenCalled();
  });

  it('answers 404 when the client does not exist', async () => {
    const { useCase } = setup({ clientExists: false });

    await expect(
      useCase.execute({ actor: admin, clientId: 99 }, page),
    ).rejects.toThrow(NotFoundError);
  });

  it('turns the day range into business-time instants, both days included', async () => {
    const { useCase, findPageByClient } = setup();

    await useCase.execute(
      {
        actor: admin,
        clientId: 10,
        action: 'client.created',
        from: '2026-10-01',
        to: '2026-10-31',
      },
      page,
    );

    // America/Bogota is UTC-05:00: 2026-10-01 00:00 local = 05:00 UTC, and
    // the range ends at 2026-11-01 00:00 local (exclusive).
    expect(findPageByClient).toHaveBeenCalledWith(
      10,
      {
        action: 'client.created',
        from: new Date('2026-10-01T05:00:00.000Z'),
        to: new Date('2026-11-01T05:00:00.000Z'),
      },
      page,
    );
  });

  it('accepts the same day as from and to', async () => {
    const { useCase, findPageByClient } = setup();

    await useCase.execute(
      { actor: admin, clientId: 10, from: '2026-10-20', to: '2026-10-20' },
      page,
    );

    expect(findPageByClient).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        from: new Date('2026-10-20T05:00:00.000Z'),
        to: new Date('2026-10-21T05:00:00.000Z'),
      }),
      page,
    );
  });

  it('rejects from after to with a validation error', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        { actor: admin, clientId: 10, from: '2026-10-31', to: '2026-10-01' },
        page,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an impossible date with a validation error, not a 500', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ actor: admin, clientId: 10, from: '2026-02-30' }, page),
    ).rejects.toThrow(ValidationError);
  });
});
