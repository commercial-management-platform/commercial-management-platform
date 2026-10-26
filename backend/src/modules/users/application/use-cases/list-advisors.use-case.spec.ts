import { describe, expect, it, vi } from 'vitest';
import { ListAdvisorsUseCase } from './list-advisors.use-case.js';
import type {
  Advisor,
  AdvisorDirectoryPort,
} from '../ports/advisor-directory.port.js';
import { AdvisorStatus } from '../ports/advisor-profile.port.js';

describe('ListAdvisorsUseCase', () => {
  const advisor: Advisor = {
    id: 3,
    userId: 'user-3',
    name: 'Laura Gómez',
    email: 'laura@cmp.com',
    phone: null,
    status: AdvisorStatus.Active,
  };

  function createDirectory(): AdvisorDirectoryPort {
    return { findAll: vi.fn().mockResolvedValue([advisor]) };
  }

  it('lists only active advisors by default', async () => {
    const directory = createDirectory();
    const result = await new ListAdvisorsUseCase(directory).execute();

    expect(result).toEqual([advisor]);
    expect(directory.findAll).toHaveBeenCalledWith({ includeInactive: false });
  });

  it('includes inactive advisors when asked', async () => {
    const directory = createDirectory();
    await new ListAdvisorsUseCase(directory).execute(true);

    expect(directory.findAll).toHaveBeenCalledWith({ includeInactive: true });
  });
});
