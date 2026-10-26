import { ValidationError } from '../../../shared/domain/errors/index.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { VisitStatus } from '../domain/visit-status.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { ListVisitsUseCase } from './list-visits.use-case.js';

const admin = { id: 'usr_admin', role: UserRole.Admin };
const advisor = { id: 'usr_advisor', role: UserRole.Advisor };
const page = { page: 1, limit: 20 };

function setup() {
  const visitRepository = {
    findPage: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  const useCase = new ListVisitsUseCase(
    visitRepository as unknown as VisitRepository,
  );
  return { visitRepository, useCase };
}

describe('ListVisitsUseCase', () => {
  it('passes the advisorId filter through for admin and director', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(admin, { advisorId: 7 }, page);

    expect(visitRepository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ advisorId: 7 }),
      page,
    );
    expect(visitRepository.findPage.mock.calls[0][0]).not.toHaveProperty(
      'advisorUserId',
    );
  });

  it('ignores advisorId and forces advisorUserId for an advisor', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(advisor, { advisorId: 7 }, page);

    expect(visitRepository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ advisorUserId: 'usr_advisor' }),
      page,
    );
    expect(visitRepository.findPage.mock.calls[0][0]).not.toHaveProperty(
      'advisorId',
    );
  });

  it('resolves date into a scheduledWithin range', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(admin, { date: '2026-10-22' }, page);

    const filter = visitRepository.findPage.mock.calls[0][0];
    expect(filter.scheduledWithin.start.toISOString()).toBe(
      '2026-10-22T05:00:00.000Z',
    );
    expect(filter.scheduledWithin.end.toISOString()).toBe(
      '2026-10-23T05:00:00.000Z',
    );
  });

  it('resolves week into a Monday-to-Sunday range', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(admin, { week: '2026-10-22' }, page);

    const filter = visitRepository.findPage.mock.calls[0][0];
    expect(filter.scheduledWithin.start.toISOString()).toBe(
      '2026-10-19T05:00:00.000Z',
    );
    expect(filter.scheduledWithin.end.toISOString()).toBe(
      '2026-10-26T05:00:00.000Z',
    );
  });

  it('rejects date and week sent together', async () => {
    const { visitRepository, useCase } = setup();

    await expect(
      useCase.execute(admin, { date: '2026-10-22', week: '2026-10-22' }, page),
    ).rejects.toThrow(ValidationError);
    expect(visitRepository.findPage).not.toHaveBeenCalled();
  });

  it('returns the paginated result as-is', async () => {
    const { visitRepository, useCase } = setup();
    const items = [{ id: 1 }];
    visitRepository.findPage.mockResolvedValue({ items, total: 1 });

    const result = await useCase.execute(admin, {}, page);

    expect(result).toEqual({ data: items, total: 1, page: 1, limit: 20 });
  });

  it('passes the status and zoneId filters through', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(
      admin,
      { zoneId: 3, status: VisitStatus.Cancelled },
      page,
    );

    expect(visitRepository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ zoneId: 3, status: VisitStatus.Cancelled }),
      page,
    );
  });
});
