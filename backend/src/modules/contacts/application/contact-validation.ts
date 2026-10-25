import { ValidationError } from '../../../shared/domain/errors/index.js';
import { isValidEmail } from '../../../shared/domain/email.js';

// Tolerant phone pattern: digits, spaces and the usual separators.
const PHONE_PATTERN = /^[0-9+()\s.-]{7,30}$/;

export const MAX_NAME_LENGTH = 120;
export const MAX_JOB_TITLE_LENGTH = 120;

/**
 * Domain validation of the contact fields. The DTOs already validate the
 * transport payload, but the use cases are also called directly (tests,
 * other modules), so the rules are enforced here too.
 */
export function normalizeName(value: string | null | undefined): string {
  const name = (value ?? '').trim();
  if (!name) {
    throw new ValidationError('name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(
      `name must be at most ${MAX_NAME_LENGTH} characters`,
    );
  }
  return name;
}

export function normalizeJobTitle(
  value: string | null | undefined,
): string | null {
  const jobTitle = (value ?? '').trim();
  if (!jobTitle) {
    return null;
  }
  if (jobTitle.length > MAX_JOB_TITLE_LENGTH) {
    throw new ValidationError(
      `jobTitle must be at most ${MAX_JOB_TITLE_LENGTH} characters`,
    );
  }
  return jobTitle;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = (value ?? '').trim().toLowerCase();
  if (!email) {
    return null;
  }
  if (!isValidEmail(email)) {
    throw new ValidationError('email must be a valid email address');
  }
  return email;
}

export function normalizePhone(
  value: string | null | undefined,
  field: 'phone' | 'mobile',
): string | null {
  const phone = (value ?? '').trim();
  if (!phone) {
    return null;
  }
  if (!PHONE_PATTERN.test(phone)) {
    throw new ValidationError(
      `${field} must be a valid phone number (7 to 30 characters)`,
    );
  }
  return phone;
}

/**
 * A contact needs at least one way to reach it: phone, mobile or email
 * (CA-02). Receives the already normalized values, where an empty value is
 * null.
 */
export function assertContactMethod(methods: {
  phone: string | null;
  mobile: string | null;
  email: string | null;
}): void {
  if (!methods.phone && !methods.mobile && !methods.email) {
    throw new ValidationError(
      'at least one contact method is required: phone, mobile or email',
    );
  }
}
