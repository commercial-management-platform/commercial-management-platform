/**
 * Business calendar of the platform: America/Bogota (UTC-05:00, no daylight
 * saving time). Instants are stored in UTC (timestamptz); "today", "a past
 * date" and "this week" are always computed with this offset, whatever the
 * time zone of the server. The week runs from Monday to Sunday.
 *
 * Pure TypeScript with a fixed offset: Colombia has not used daylight saving
 * time since 1993, so no time zone database is needed.
 */
export const BUSINESS_TIME_ZONE = 'America/Bogota';

const BUSINESS_UTC_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date only, YYYY-MM-DD. */
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 24-hour time, HH:mm. */
export const TIME_HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Half-open range of instants: start <= instant < end. */
export interface InstantRange {
  start: Date;
  end: Date;
}

/** Calendar date (YYYY-MM-DD) of `instant` in business time. */
export function businessDateOf(instant: Date): string {
  return new Date(instant.getTime() + BUSINESS_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** Today's calendar date (YYYY-MM-DD) in business time. */
export function businessToday(now: Date = new Date()): string {
  return businessDateOf(now);
}

/** The UTC instant of `date` at `time` (HH:mm) in business time. */
export function businessDateTimeToInstant(
  date: string,
  time: string = '00:00',
): Date {
  const [year, month, day] = parseDate(date);
  if (!TIME_HH_MM_PATTERN.test(time)) {
    throw new RangeError(`Invalid time '${time}', expected HH:mm`);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes) - BUSINESS_UTC_OFFSET_MS,
  );
}

/** From 00:00 of `date` to 00:00 of the next day, in business time. */
export function businessDayRange(date: string): InstantRange {
  const start = businessDateTimeToInstant(date);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/**
 * From Monday 00:00 to the next Monday 00:00 of the week that contains
 * `date`, in business time.
 */
export function businessWeekRange(date: string): InstantRange {
  const [year, month, day] = parseDate(date);
  // getUTCDay: 0 is Sunday. Days elapsed since Monday: Monday 0 ... Sunday 6.
  const sinceMonday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  const start = new Date(
    businessDateTimeToInstant(date).getTime() - sinceMonday * DAY_MS,
  );
  return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

function parseDate(date: string): [number, number, number] {
  const parts = DATE_ONLY_PATTERN.test(date)
    ? date.split('-').map(Number)
    : [];
  const [year, month, day] = parts;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    parts.length !== 3 ||
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid date '${date}', expected YYYY-MM-DD`);
  }
  return [year, month, day];
}
