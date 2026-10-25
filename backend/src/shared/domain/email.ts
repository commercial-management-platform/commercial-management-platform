/** Longest valid email address (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Local part, `@` and a domain with at least one dot. No part can contain the
 * character that ends it (`@` or `.`), so there is a single way to match and
 * the check runs in linear time. The previous pattern backtracked: a 50,000
 * character input took more than a second and blocked the event loop.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** Format check shared by users, contacts and the client CSV import. */
export function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}
