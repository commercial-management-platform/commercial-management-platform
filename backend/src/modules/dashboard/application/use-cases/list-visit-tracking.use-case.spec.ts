import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { DashboardReadPort } from '../../domain/ports/dashboard-read.port.js';
import { ListVisitTrackingUseCase } from './list-visit-tracking.use-case.js';

const admin = { id: 'usr-admin', role: UserRole.Admin };
const advisor = { id: 'usr-advisor', role: UserRole.Advisor };
const page = { page: 2, limit: 10 };

function setup() {
  const result = { data: [], total: 0, page: 2, limit: 10 };
  const trackingPage = vi.fn().mockResolvedValue(result);
  const reader = { kpis: vi.fn(), trackingPage } as unknown as DashboardReadPort;
  return { useCase: new ListVisitTrackingUseCase(reader), trackingPage, result };
}

describe('ListVisitTrackingUseCase', () => {
  it('passes the table filters and the page (CA-06)', async () => {
    const { useCase, trackingPage, result } = setup();

    const answer = await useCase.execute(
      admin,
      { week: '2026-10-22', zoneId: 2, advisorId: 3, status: VisitStatus.Visited },
      page,
    );

    expect(answer).toBe(result);
    expect(trackingPage).toHaveBeenCalledWith(
      {
        from: new Date('2026-10-19T05:00:00.000Z'),
        to: new Date('2026-10-26T05:00:00.000Z'),
        zoneId: 2,
        advisorId: 3,
        status: VisitStatus.Visited,
      },
      page,
    );
  });

  it('shows the current week when no date is sent (CA-02)', async () => {
    const { useCase, trackingPage } = setup();

    await useCase.execute(admin, {}, page, new Date('2026-10-22T15:00:00Z'));

    expect(trackingPage.mock.calls[0][0]).toMatchObject({
      from: new Date('2026-10-19T05:00:00.000Z'),
      to: new Date('2026-10-26T05:00:00.000Z'),
    });
  });

  it('accepts an inclusive range of days instead of a week', async () => {
    const { useCase, trackingPage } = setup();

    await useCase.execute(admin, { fromDate: '2026-10-01', toDate: '2026-10-31' }, page);

    expect(trackingPage.mock.calls[0][0]).toMatchObject({
      from: new Date('2026-10-01T05:00:00.000Z'),
      to: new Date('2026-11-01T05:00:00.000Z'),
    });
  });

  it('limits an advisor to their own visits, ignoring advisorId (CA-03)', async () => {
    const { useCase, trackingPage } = setup();

    await useCase.execute(advisor, { advisorId: 99 }, page);

    const filter = trackingPage.mock.calls[0][0];
    expect(filter.advisorUserId).toBe('usr-advisor');
    expect(filter).not.toHaveProperty('advisorId');
  });

  it('rejects a week combined with a range of days', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(admin, { week: '2026-10-22', fromDate: '2026-10-01' }, page),
    ).rejects.toThrow(ValidationError);
  });
});
