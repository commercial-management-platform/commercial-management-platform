import { describe, expect, it, vi } from 'vitest';
import { AdvisorsController } from './advisors.controller.js';
import { ListAdvisorsUseCase } from '../application/use-cases/list-advisors.use-case.js';
import { AdvisorStatus } from '../application/ports/advisor-profile.port.js';

describe('AdvisorsController', () => {
  const advisor = {
    id: 3,
    userId: 'user-3',
    name: 'Laura Gómez',
    email: 'laura@cmp.com',
    phone: null,
    status: AdvisorStatus.Active,
  };

  const mockListAdvisorsUseCase = {
    execute: vi.fn().mockResolvedValue([advisor]),
  } as unknown as ListAdvisorsUseCase;

  it('lists active advisors by default', async () => {
    const controller = new AdvisorsController(mockListAdvisorsUseCase);
    const result = await controller.listAdvisors({});

    expect(result).toEqual([advisor]);
    expect(mockListAdvisorsUseCase.execute).toHaveBeenCalledWith(false);
  });

  it('passes includeInactive to the use case', async () => {
    const controller = new AdvisorsController(mockListAdvisorsUseCase);
    await controller.listAdvisors({ includeInactive: true });

    expect(mockListAdvisorsUseCase.execute).toHaveBeenCalledWith(true);
  });
});
