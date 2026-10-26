import { DomainError } from './domain.error.js';

/** Business rule violated by the input. Answered as 400. */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
