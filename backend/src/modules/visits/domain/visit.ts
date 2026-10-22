import { ValidationError } from '../../../shared/domain/errors/index.js';
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
  /** Filled by HU-09 when the visit is recorded. */
  actualDate: Date | null;
  status: VisitStatus;
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

  private assertScheduled(action: string): void {
    if (this.status !== VisitStatus.Scheduled) {
      throw new ValidationError(
        `Only a scheduled visit can be ${action}; this visit is ${this.status}`,
      );
    }
  }
}
