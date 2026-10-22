import { ValidationError } from '../../../shared/domain/errors/index.js';
import { businessDateTimeToInstant } from '../../../shared/domain/time/business-time.js';
import { InterestLevel } from './visit-interest.js';
import { VisitStatus } from './visit-status.js';
import { Visit } from './visit.js';

const scheduledToday = businessDateTimeToInstant('2026-10-22', '09:00');
const sameDayLater = businessDateTimeToInstant('2026-10-22', '15:00');
const nextDay = businessDateTimeToInstant('2026-10-23', '09:00');

function scheduledVisit(scheduledDate = scheduledToday): Visit {
  return Visit.schedule({
    clientId: 1,
    advisorId: 2,
    routeId: null,
    scheduledDate,
    visitOrder: null,
  });
}

describe('Visit.start', () => {
  it('sets startedAt and the check-in fields the backend computed', () => {
    const visit = scheduledVisit();

    visit.start({
      latitude: 4.711,
      longitude: -74.0721,
      distanceMeters: 5,
      confirmed: true,
      now: sameDayLater,
    });

    expect(visit.startedAt).toEqual(sameDayLater);
    expect(visit.checkInLatitude).toBe(4.711);
    expect(visit.checkInLongitude).toBe(-74.0721);
    expect(visit.checkInDistanceMeters).toBe(5);
    expect(visit.locationConfirmed).toBe(true);
  });

  it('accepts no location at all, leaving it unconfirmed', () => {
    const visit = scheduledVisit();

    visit.start({
      latitude: null,
      longitude: null,
      distanceMeters: null,
      confirmed: false,
      now: sameDayLater,
    });

    expect(visit.checkInDistanceMeters).toBeNull();
    expect(visit.locationConfirmed).toBe(false);
  });

  it('keeps the original startedAt on a retry, but updates the location', () => {
    const visit = scheduledVisit();
    const firstCall = businessDateTimeToInstant('2026-10-22', '10:00');
    const secondCall = businessDateTimeToInstant('2026-10-22', '10:05');

    visit.start({
      latitude: 1,
      longitude: 1,
      distanceMeters: 100,
      confirmed: false,
      now: firstCall,
    });
    visit.start({
      latitude: 2,
      longitude: 2,
      distanceMeters: 5,
      confirmed: true,
      now: secondCall,
    });

    expect(visit.startedAt).toEqual(firstCall);
    expect(visit.checkInLatitude).toBe(2);
    expect(visit.checkInDistanceMeters).toBe(5);
    expect(visit.locationConfirmed).toBe(true);
  });

  it('rejects a visit that is not due today', () => {
    const visit = scheduledVisit(nextDay);

    expect(() =>
      visit.start({
        latitude: null,
        longitude: null,
        distanceMeters: null,
        confirmed: false,
        now: scheduledToday,
      }),
    ).toThrow(ValidationError);
  });

  it.each([VisitStatus.Visited, VisitStatus.Cancelled])(
    'rejects a visit that is already %s',
    (status) => {
      const visit = scheduledVisit();
      visit.status = status;

      expect(() =>
        visit.start({
          latitude: null,
          longitude: null,
          distanceMeters: null,
          confirmed: false,
          now: sameDayLater,
        }),
      ).toThrow(ValidationError);
    },
  );
});

describe('Visit.recordOutcome', () => {
  const baseInput = {
    visitObjectiveId: 1,
    visitTypeId: 2,
    interestLevel: InterestLevel.High,
    interestReason: null,
    competitorMentioned: null,
    startedAt: null,
    finishedAt: null,
    now: sameDayLater,
  };

  it('marks the visit visited and fills actualDate', () => {
    const visit = scheduledVisit();

    visit.recordOutcome(baseInput);

    expect(visit.status).toBe(VisitStatus.Visited);
    expect(visit.actualDate).toEqual(sameDayLater);
    expect(visit.visitObjectiveId).toBe(1);
    expect(visit.visitTypeId).toBe(2);
    expect(visit.interestLevel).toBe(InterestLevel.High);
  });

  it('uses startedAt from the body when the visit was never started', () => {
    const visit = scheduledVisit();
    const bodyStartedAt = businessDateTimeToInstant('2026-10-22', '09:30');

    visit.recordOutcome({ ...baseInput, startedAt: bodyStartedAt });

    expect(visit.startedAt).toEqual(bodyStartedAt);
  });

  it('leaves startedAt null when the visit was never started and the body sends none', () => {
    const visit = scheduledVisit();

    visit.recordOutcome(baseInput);

    expect(visit.startedAt).toBeNull();
  });

  it('keeps the startedAt set by /start, ignoring the body value', () => {
    const visit = scheduledVisit();
    visit.start({
      latitude: null,
      longitude: null,
      distanceMeters: null,
      confirmed: false,
      now: scheduledToday,
    });
    const bodyStartedAt = businessDateTimeToInstant('2026-10-22', '11:00');

    visit.recordOutcome({ ...baseInput, startedAt: bodyStartedAt });

    expect(visit.startedAt).toEqual(scheduledToday);
  });

  it('rejects finishedAt before startedAt', () => {
    const visit = scheduledVisit();
    const startedAt = businessDateTimeToInstant('2026-10-22', '10:00');
    const finishedAt = businessDateTimeToInstant('2026-10-22', '09:00');

    expect(() =>
      visit.recordOutcome({ ...baseInput, startedAt, finishedAt }),
    ).toThrow(ValidationError);
  });

  it('accepts a finishedAt equal to startedAt', () => {
    const visit = scheduledVisit();
    const instant = businessDateTimeToInstant('2026-10-22', '10:00');

    expect(() =>
      visit.recordOutcome({
        ...baseInput,
        startedAt: instant,
        finishedAt: instant,
      }),
    ).not.toThrow();
  });

  it('rejects a visit that is not due today', () => {
    const visit = scheduledVisit(nextDay);

    expect(() => visit.recordOutcome(baseInput)).toThrow(ValidationError);
  });

  it('rejects recording a second outcome (status is no longer scheduled)', () => {
    const visit = scheduledVisit();
    visit.recordOutcome(baseInput);

    expect(() => visit.recordOutcome(baseInput)).toThrow(ValidationError);
  });

  it('rejects an already cancelled visit', () => {
    const visit = scheduledVisit();
    visit.cancel();

    expect(() => visit.recordOutcome(baseInput)).toThrow(ValidationError);
  });
});
