import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { GetVisitAgendaUseCase } from './get-visit-agenda.use-case.js';

const advisor = { id: 'usr_advisor', role: UserRole.Advisor };

function setup() {
  const visitRepository = {
    findAgenda: vi.fn().mockResolvedValue([]),
  };
  const useCase = new GetVisitAgendaUseCase(
    visitRepository as unknown as VisitRepository,
  );
  return { visitRepository, useCase };
}

describe('GetVisitAgendaUseCase', () => {
  it('defaults to the day period with the given date', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(advisor, { date: '2026-10-22' });

    expect(visitRepository.findAgenda).toHaveBeenCalledWith('usr_advisor', {
      start: new Date('2026-10-22T05:00:00.000Z'),
      end: new Date('2026-10-23T05:00:00.000Z'),
    });
  });

  it('uses a Monday-to-Sunday range for period=week', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(advisor, { period: 'week', date: '2026-10-22' });

    expect(visitRepository.findAgenda).toHaveBeenCalledWith('usr_advisor', {
      start: new Date('2026-10-19T05:00:00.000Z'),
      end: new Date('2026-10-26T05:00:00.000Z'),
    });
  });

  it('defaults the date to today in business time', async () => {
    const { visitRepository, useCase } = setup();

    await useCase.execute(advisor, {});

    expect(visitRepository.findAgenda).toHaveBeenCalledOnce();
  });
});
