import type {
  Advisor,
  AdvisorDirectoryPort,
} from '../ports/advisor-directory.port.js';

export class ListAdvisorsUseCase {
  constructor(private readonly advisors: AdvisorDirectoryPort) {}

  async execute(includeInactive = false): Promise<Advisor[]> {
    return this.advisors.findAll({ includeInactive });
  }
}
