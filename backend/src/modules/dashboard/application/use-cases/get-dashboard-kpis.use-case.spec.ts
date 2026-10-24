import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { CommercialKpis } from '../../domain/entities/commercial-kpis.js';
import type { DashboardReadPort } from '../../domain/ports/dashboard-read.port.js';
import { GetDashboardKpisUseCase } from './get-dashboard-kpis.use-case.js';

const director = { id: 'usr-director', role: UserRole.Director };
const advisor = { id: 'usr-advisor', role: UserRole.Advisor };

const kpis: CommercialKpis = {
  scheduledVisits: 4,
  completedVisits: 3,
  quotedValue: '1500000',
  closedOrders: 1,
  billedValue: '900000',
};

function setup() {
  const read = vi.fn().mockResolvedValue(kpis);
  const reader = { kpis: read, trackingPage: vi.fn() } as unknown as DashboardReadPort;
  return { useCase: new GetDashboardKpisUseCase(reader), read };
}

describe('GetDashboardKpisUseCase', () => {
  it('reads the week asked and the one before, Monday to Sunday in Bogota (CA-02)', async () => {
    const { useCase, read } = setup();

    // 2026-10-22 is a Thursday; America/Bogota is UTC-05:00.
    const result = await useCase.execute(director, { week: '2026-10-22', zoneId: 2 });

    expect(result.week).toEqual({ from: '2026-10-19', to: '2026-10-25', isoWeek: 43 });
    expect(result.current).toBe(kpis);
    expect(read).toHaveBeenCalledWith({
      zoneId: 2,
      advisorId: undefined,
      from: new Date('2026-10-19T05:00:00.000Z'),
      to: new Date('2026-10-26T05:00:00.000Z'),
      fromDate: '2026-10-19',
      toDate: '2026-10-25',
    });
    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-10-12T05:00:00.000Z'),
        to: new Date('2026-10-19T05:00:00.000Z'),
        fromDate: '2026-10-12',
        toDate: '2026-10-18',
      }),
    );
  });

  it('defaults to the current business week', async () => {
    const { useCase } = setup();

    // Sunday 2026-10-25 23:00 in Bogota is already Monday in UTC.
    const result = await useCase.execute(director, {}, new Date('2026-10-26T04:00:00Z'));

    expect(result.week.from).toBe('2026-10-19');
  });

  it('lets the director filter by advisor', async () => {
    const { useCase, read } = setup();

    await useCase.execute(director, { advisorId: 3 });

    expect(read.mock.calls[0][0]).toMatchObject({ advisorId: 3 });
  });

  it('limits an advisor to their own indicators, ignoring advisorId (CA-03)', async () => {
    const { useCase, read } = setup();

    await useCase.execute(advisor, { advisorId: 99 });

    for (const [filter] of read.mock.calls) {
      expect(filter.advisorUserId).toBe('usr-advisor');
      expect(filter).not.toHaveProperty('advisorId');
    }
  });

  it('rejects an impossible date with a 400', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(director, { week: '2026-02-30' })).rejects.toThrow(
      ValidationError,
    );
  });
});
