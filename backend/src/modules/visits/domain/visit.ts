import { ValidationError } from '../../../shared/domain/errors/index.js';
import { businessDateOf } from '../../../shared/domain/time/business-time.js';
import type { InterestLevel, InterestReason } from './visit-interest.js';
import { VisitStatus } from './visit-status.js';

export interface VisitProps {
  id: number | null;
  clientId: number;
  /** advisor.id, not the betterAuth user id. */
  advisorId: number;
  routeId: number | null;
  /** Scheduled instant (UTC). */
  scheduledDate: Date;
  /** Position of the client in the route when generated from a route. */
  visitOrder: number | null;
  /** Filled when the outcome is recorded (HU-09). */
  actualDate: Date | null;
  status: VisitStatus;
  /** Set the first time /start is called; kept afterwards. */
  startedAt: Date | null;
  /** Set when the outcome is recorded. */
  finishedAt: Date | null;
  /** Advisor's location at check-in; null when the device did not provide it. */
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  /** Distance to the client, in meters; null when it could not be computed. */
  checkInDistanceMeters: number | null;
  /** Computed by the backend only; the advisor never sends or sets it. */
  locationConfirmed: boolean;
  visitObjectiveId: number | null;
  visitTypeId: number | null;
  interestLevel: InterestLevel | null;
  interestReason: InterestReason | null;
  competitorMentioned: string | null;
  /** Set by the database on insert; null until the visit is saved. */
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Visit {
  readonly id: number | null;
  clientId: number;
  advisorId: number;
  routeId: number | null;
  scheduledDate: Date;
  visitOrder: number | null;
  actualDate: Date | null;
  status: VisitStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInDistanceMeters: number | null;
  locationConfirmed: boolean;
  visitObjectiveId: number | null;
  visitTypeId: number | null;
  interestLevel: InterestLevel | null;
  interestReason: InterestReason | null;
  competitorMentioned: string | null;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: VisitProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.advisorId = props.advisorId;
    this.routeId = props.routeId;
    this.scheduledDate = props.scheduledDate;
    this.visitOrder = props.visitOrder;
    this.actualDate = props.actualDate;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.finishedAt = props.finishedAt;
    this.checkInLatitude = props.checkInLatitude;
    this.checkInLongitude = props.checkInLongitude;
    this.checkInDistanceMeters = props.checkInDistanceMeters;
    this.locationConfirmed = props.locationConfirmed;
    this.visitObjectiveId = props.visitObjectiveId;
    this.visitTypeId = props.visitTypeId;
    this.interestLevel = props.interestLevel;
    this.interestReason = props.interestReason;
    this.competitorMentioned = props.competitorMentioned;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** A new visit, not saved yet, in the scheduled status. */
  static schedule(input: {
    clientId: number;
    advisorId: number;
    routeId: number | null;
    scheduledDate: Date;
    visitOrder: number | null;
  }): Visit {
    return new Visit({
      id: null,
      ...input,
      actualDate: null,
      status: VisitStatus.Scheduled,
      startedAt: null,
      finishedAt: null,
      checkInLatitude: null,
      checkInLongitude: null,
      checkInDistanceMeters: null,
      locationConfirmed: false,
      visitObjectiveId: null,
      visitTypeId: null,
      interestLevel: null,
      interestReason: null,
      competitorMentioned: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  reschedule(scheduledDate: Date): void {
    this.assertScheduled('rescheduled');
    this.scheduledDate = scheduledDate;
  }

  cancel(): void {
    this.assertScheduled('cancelled');
    this.status = VisitStatus.Cancelled;
  }

  /**
   * The advisor starts the visit from their agenda. Only on the day it is
   * scheduled (business time); `now` is passed in so the check is testable.
   * The backend is the only one that computes `confirmed` (the Haversine
   * distance against the client, compared to the check-in radius) — the
   * advisor never sends or sets it. Calling it again while still `scheduled`
   * retries the location, but `startedAt` is kept from the first call.
   */
  start(input: {
    latitude: number | null;
    longitude: number | null;
    distanceMeters: number | null;
    confirmed: boolean;
    now: Date;
  }): void {
    this.assertScheduled('started');
    this.assertScheduledToday(input.now);

    this.startedAt ??= input.now;
    this.checkInLatitude = input.latitude;
    this.checkInLongitude = input.longitude;
    this.checkInDistanceMeters = input.distanceMeters;
    this.locationConfirmed = input.confirmed;
  }

  /**
   * Records the outcome of the visit and marks it `visited`. Only one
   * outcome per visit: calling this again fails because the status is no
   * longer `scheduled`.
   */
  recordOutcome(input: {
    visitObjectiveId: number;
    visitTypeId: number;
    interestLevel: InterestLevel;
    interestReason: InterestReason | null;
    competitorMentioned: string | null;
    /** Used only when the visit was never started with /start. */
    startedAt: Date | null;
    finishedAt: Date | null;
    now: Date;
  }): void {
    this.assertScheduled('recorded');
    this.assertScheduledToday(input.now);

    const startedAt = this.startedAt ?? input.startedAt;
    if (
      input.finishedAt !== null &&
      startedAt !== null &&
      input.finishedAt.getTime() < startedAt.getTime()
    ) {
      throw new ValidationError('finishedAt cannot be before startedAt');
    }

    this.startedAt = startedAt;
    this.finishedAt = input.finishedAt;
    this.visitObjectiveId = input.visitObjectiveId;
    this.visitTypeId = input.visitTypeId;
    this.interestLevel = input.interestLevel;
    this.interestReason = input.interestReason;
    this.competitorMentioned = input.competitorMentioned;
    this.actualDate = input.now;
    this.status = VisitStatus.Visited;
  }

  private assertScheduled(action: string): void {
    if (this.status !== VisitStatus.Scheduled) {
      throw new ValidationError(
        `Only a scheduled visit can be ${action}; this visit is ${this.status}`,
      );
    }
  }

  /** A visit can only be started or recorded the day it is due (business time). */
  private assertScheduledToday(now: Date): void {
    const scheduledDay = businessDateOf(this.scheduledDate);
    const today = businessDateOf(now);
    if (scheduledDay !== today) {
      throw new ValidationError(
        `The visit is scheduled for ${scheduledDay}, not today (${today}); reschedule it first`,
      );
    }
  }
}
