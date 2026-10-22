import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import { VisitStatus } from '../domain/visit-status.js';
import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';

export class CancelVisitUseCase {
  constructor(private readonly visitRepository: VisitRepository) {}

  async execute(id: number): Promise<Visit> {
    const visit = await this.visitRepository.findById(id);
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }
    visit.cancel();

    // The status may change between the read and the write (HU-09).
    const updated = await this.visitRepository.updateIfStatus(
      visit,
      VisitStatus.Scheduled,
    );
    if (!updated) {
      throw new ValidationError('The visit is no longer scheduled');
    }
    // HU-16: registrar visit_cancelled
    return updated;
  }
}
