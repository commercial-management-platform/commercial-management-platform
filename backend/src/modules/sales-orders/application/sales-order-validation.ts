import { ValidationError } from '../../../shared/domain/errors/index.js';

const VALUE_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;

export function assertOrderDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError(`${field} must be a valid calendar date`);
  }
}

/** Delivery may be the same day as the order, never before it. */
export function assertDeliveryNotBeforeOrder(
  date: string,
  estimatedDeliveryDate: string,
): void {
  if (estimatedDeliveryDate < date) {
    throw new ValidationError(
      'estimatedDeliveryDate cannot be before the order date',
    );
  }
}

export function assertOrderValue(value: string): void {
  if (!VALUE_PATTERN.test(value)) {
    throw new ValidationError(
      'value must be a non-negative decimal with at most 12 integer digits and 6 decimal places',
    );
  }
}
