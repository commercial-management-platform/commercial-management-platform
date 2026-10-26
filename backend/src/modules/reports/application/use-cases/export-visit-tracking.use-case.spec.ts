import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { ReportSourcesPort } from '../../domain/ports/report-sources.port.js';
import { ExportVisitTrackingUseCase } from './export-visit-tracking.use-case.js';

const admin = { id: 'usr-admin', role: UserRole.Admin };
const director = { id: 'usr-director', role: UserRole.Director };
const advisor = { id: 'usr-advisor', role: UserRole.Advisor };

function setup() {
  const rows = (async function* () {})();
  const visitTracking = vi.fn().mockReturnValue(rows);
  const sources = {
    visitTracking,
    quotes: vi.fn(),
    salesOrders: vi.fn(),
  } as unknown as ReportSourcesPort;
  return { useCase: new ExportVisitTrackingUseCase(sources), visitTracking, rows };
}

describe('ExportVisitTrackingUseCase', () => {
  it.each([admin, director])(
    'lets $role export every visit and filter by advisor, zone and status',
    async (actor) => {
      const { useCase, visitTracking, rows } = setup();

      const result = await useCase.execute(actor, {
        advisorId: 3,
        zoneId: 2,
        status: VisitStatus.Visited,
      });

      expect(result).toBe(rows);
      expect(visitTracking).toHaveBeenCalledWith({
        from: undefined,
        to: undefined,
        zoneId: 2,
        status: VisitStatus.Visited,
        advisorId: 3,
      });
    },
  );

  it('limits an advisor to their own visits, ignoring advisorId (CA-03)', async () => {
    const { useCase, visitTracking } = setup();

    await useCase.execute(advisor, { advisorId: 99 });

    const filter = visitTracking.mock.calls[0][0];
    expect(filter.advisorUserId).toBe('usr-advisor');
    expect(filter).not.toHaveProperty('advisorId');
  });

  it('turns a week into Monday 00:00 .. next Monday 00:00, business time', async () => {
    const { useCase, visitTracking } = setup();

    // 2026-10-22 is a Thursday; America/Bogota is UTC-05:00.
    await useCase.execute(admin, { week: '2026-10-22' });

    expect(visitTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-10-19T05:00:00.000Z'),
        to: new Date('2026-10-26T05:00:00.000Z'),
      }),
    );
  });

  it('turns fromDate/toDate into an inclusive range of days', async () => {
    const { useCase, visitTracking } = setup();

    await useCase.execute(admin, { fromDate: '2026-10-01', toDate: '2026-10-31' });

    expect(visitTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-10-01T05:00:00.000Z'),
        to: new Date('2026-11-01T05:00:00.000Z'),
      }),
    );
  });

  it('accepts an open range', async () => {
    const { useCase, visitTracking } = setup();

    await useCase.execute(admin, { fromDate: '2026-10-01' });

    expect(visitTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-10-01T05:00:00.000Z'),
        to: undefined,
      }),
    );
  });

  it.each([
    ['week with a range', { week: '2026-10-22', fromDate: '2026-10-01' }],
    ['fromDate after toDate', { fromDate: '2026-10-31', toDate: '2026-10-01' }],
    ['an impossible date', { toDate: '2026-02-30' }],
    ['an impossible week', { week: '2026-13-01' }],
  ])('rejects %s before reading any row', async (_, input) => {
    const { useCase, visitTracking } = setup();

    await expect(useCase.execute(admin, input)).rejects.toThrow(ValidationError);
    expect(visitTracking).not.toHaveBeenCalled();
  });
});
