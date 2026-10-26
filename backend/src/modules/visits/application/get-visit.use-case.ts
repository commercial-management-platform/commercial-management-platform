import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';
import { findVisibleVisit } from './visit-visibility.js';

export class GetVisitUseCase {
  constructor(private readonly visitRepository: VisitRepository) {}

  async execute(actor: VisitActor, id: number): Promise<Visit> {
    return findVisibleVisit(this.visitRepository, actor, id);
  }
}
