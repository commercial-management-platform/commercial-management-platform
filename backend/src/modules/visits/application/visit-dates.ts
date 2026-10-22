import { ValidationError } from '../../../shared/domain/errors/index.js';

/** A visit cannot be scheduled for an instant that already passed. */
export function assertNotPast(scheduledDate: Date, now: Date = new Date()): void {
  if (scheduledDate.getTime() < now.getTime()) {
    throw new ValidationError(
      `The scheduled date ${scheduledDate.toISOString()} is in the past`,
    );
  }
}

/**
 * Runs a business-time computation and answers a malformed date or time
 * (RangeError from the helper) as a 400 instead of a 500.
 */
export function inBusinessTime<T>(compute: () => T): T {
  try {
    return compute();
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}
