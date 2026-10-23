import { ValidationError } from '../../../../shared/domain/errors/index.js';

/**
 * Quote inputs retain up to three decimal places. Multiplication therefore
 * fits exactly in the six decimal places stored for subtotals and totals.
 * No JavaScript floating-point arithmetic is used.
 */
export const QUOTE_INPUT_DECIMAL_SCALE = 3;
export const QUOTE_TOTAL_DECIMAL_SCALE = 6;

export const QUOTE_INPUT_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;
export const QUOTE_INPUT_DECIMAL_MESSAGE = `must be a non-negative decimal with at most ${QUOTE_INPUT_DECIMAL_SCALE} decimal places`;

export function assertDecimal(
  value: string,
  field: string,
  options: { positive?: boolean } = {},
): bigint {
  if (!QUOTE_INPUT_DECIMAL_PATTERN.test(value)) {
    throw new ValidationError(`${field} ${QUOTE_INPUT_DECIMAL_MESSAGE}`);
  }
  const scaled = toScaled(value, QUOTE_INPUT_DECIMAL_SCALE);
  if (options.positive && scaled <= 0n) {
    throw new ValidationError(`${field} must be greater than zero`);
  }
  return scaled;
}

export function calculateSubtotal(quantity: string, price: string): string {
  const quantityScaled = assertDecimal(quantity, 'quantity', {
    positive: true,
  });
  const priceScaled = assertDecimal(price, 'price');
  return fromScaled(quantityScaled * priceScaled, QUOTE_TOTAL_DECIMAL_SCALE);
}

export function calculateTotal(subtotals: readonly string[]): string {
  const total = subtotals.reduce(
    (sum, subtotal) => sum + parseStoredDecimal(subtotal),
    0n,
  );
  return fromScaled(total, QUOTE_TOTAL_DECIMAL_SCALE);
}

function parseStoredDecimal(value: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) {
    throw new ValidationError('subtotal is not a valid stored decimal');
  }
  return toScaled(value, QUOTE_TOTAL_DECIMAL_SCALE);
}

function toScaled(value: string, scale: number): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(scale, '0')}`);
}

function fromScaled(value: bigint, scale: number): string {
  const negative = value < 0n;
  const raw = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const whole = raw.slice(0, -scale);
  const fraction = raw.slice(-scale);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}
