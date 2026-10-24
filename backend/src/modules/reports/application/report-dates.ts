import { ValidationError } from '../../../shared/domain/errors/index.js';
import {
  businessDayRange,
  businessWeekRange,
  type InstantRange,
} from '../../../shared/domain/time/business-time.js';

/**
 * Date checks shared by the reports. They run before the CSV starts: once
 * the first byte is sent, an error can no longer become a 400.
 */

/** A malformed or impossible date (RangeError of the helper) is a 400. */
function inBusinessTime<T>(compute: () => T): T {
  try {
    return compute();
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}

/** Rejects '2026-02-30' and fromDate after toDate (both YYYY-MM-DD). */
export function assertDateRange(fromDate?: string, toDate?: string): void {
  if (fromDate !== undefined) inBusinessTime(() => businessDayRange(fromDate));
  if (toDate !== undefined) inBusinessTime(() => businessDayRange(toDate));
  if (fromDate !== undefined && toDate !== undefined && fromDate > toDate) {
    throw new ValidationError('fromDate cannot be after toDate');
  }
}

/**
 * Instants of a week (any day of it, Monday to Sunday) or of an inclusive
 * range of days, in business time. Either end of the range may be omitted.
 */
export function scheduledWithin(input: {
  week?: string;
  fromDate?: string;
  toDate?: string;
}): Partial<InstantRange> {
  const { week, fromDate, toDate } = input;
  if (week !== undefined) {
    if (fromDate !== undefined || toDate !== undefined) {
      throw new ValidationError('Send either week or fromDate/toDate, not both');
    }
    return inBusinessTime(() => businessWeekRange(week));
  }
  assertDateRange(fromDate, toDate);
  return {
    start: fromDate !== undefined ? businessDayRange(fromDate).start : undefined,
    end: toDate !== undefined ? businessDayRange(toDate).end : undefined,
  };
}
