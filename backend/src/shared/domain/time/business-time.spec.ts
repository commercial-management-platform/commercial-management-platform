import {
  businessDateOf,
  businessDateTimeToInstant,
  businessDayRange,
  businessToday,
  businessWeekRange,
} from './business-time.js';

describe('business time (America/Bogota, UTC-05:00)', () => {
  describe('businessDateOf / businessToday', () => {
    it('keeps Sunday 23:30 in Colombia as Sunday, although UTC is Monday', () => {
      // 2026-10-25 is a Sunday. 23:30 in Colombia is 04:30 UTC on Monday.
      const instant = new Date('2026-10-26T04:30:00Z');

      expect(businessDateOf(instant)).toBe('2026-10-25');
    });

    it('moves to the next day at 00:00 in Colombia (05:00 UTC)', () => {
      expect(businessDateOf(new Date('2026-10-26T04:59:59.999Z'))).toBe(
        '2026-10-25',
      );
      expect(businessDateOf(new Date('2026-10-26T05:00:00Z'))).toBe(
        '2026-10-26',
      );
    });

    it('computes today in Colombia from the given instant', () => {
      expect(businessToday(new Date('2026-01-01T03:00:00Z'))).toBe(
        '2025-12-31',
      );
    });
  });

  describe('businessDateTimeToInstant', () => {
    it('converts a Colombian date and time to UTC', () => {
      expect(
        businessDateTimeToInstant('2026-10-23', '08:00').toISOString(),
      ).toBe('2026-10-23T13:00:00.000Z');
    });

    it('rolls over to the next UTC day for late hours', () => {
      expect(
        businessDateTimeToInstant('2026-12-31', '21:15').toISOString(),
      ).toBe('2027-01-01T02:15:00.000Z');
    });

    it.each(['2026-02-30', '2026-13-01', '26-01-01', '2026-01-01T00:00'])(
      'rejects the invalid date %s',
      (date) => {
        expect(() => businessDateTimeToInstant(date)).toThrow(RangeError);
      },
    );

    it.each(['24:00', '8:00', '08:60'])('rejects the invalid time %s', (time) => {
      expect(() => businessDateTimeToInstant('2026-01-01', time)).toThrow(
        RangeError,
      );
    });
  });

  describe('businessDayRange', () => {
    it('spans from 05:00 UTC to 05:00 UTC of the next day', () => {
      const range = businessDayRange('2026-10-25');

      expect(range.start.toISOString()).toBe('2026-10-25T05:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-10-26T05:00:00.000Z');
    });

    it('includes Sunday 23:30 in Colombia in Sunday, not in Monday', () => {
      const instant = new Date('2026-10-26T04:30:00Z');
      const sunday = businessDayRange('2026-10-25');
      const monday = businessDayRange('2026-10-26');

      expect(instant >= sunday.start && instant < sunday.end).toBe(true);
      expect(instant >= monday.start).toBe(false);
    });
  });

  describe('businessWeekRange', () => {
    it.each([
      ['Monday', '2026-10-19'],
      ['Thursday', '2026-10-22'],
      ['Sunday', '2026-10-25'],
    ])('takes Monday to Sunday for a %s', (_day, date) => {
      const range = businessWeekRange(date);

      expect(range.start.toISOString()).toBe('2026-10-19T05:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-10-26T05:00:00.000Z');
    });

    it('keeps Sunday 23:30 in Colombia in the week that ends that Sunday', () => {
      const instant = new Date('2026-10-26T04:30:00Z');
      const week = businessWeekRange('2026-10-22');

      expect(instant >= week.start && instant < week.end).toBe(true);
      expect(businessWeekRange('2026-10-26').start > instant).toBe(true);
    });

    it('crosses months and years', () => {
      // 2027-01-01 is a Friday: its week starts on Monday 2026-12-28.
      const range = businessWeekRange('2027-01-01');

      expect(range.start.toISOString()).toBe('2026-12-28T05:00:00.000Z');
      expect(range.end.toISOString()).toBe('2027-01-04T05:00:00.000Z');
    });
  });
});
