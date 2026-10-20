import { DomainError } from './domain.error.js';

export class ForbiddenError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
