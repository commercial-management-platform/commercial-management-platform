import { ValidationError } from '../../../../shared/domain/errors/index.js';

export interface FollowUpProps {
  id: number | null;
  visitId: number;
  nextDate: string; // YYYY-MM-DD
  nextTime: string | null; // HH:mm
  activity: string;
  observation: string | null;
  responsibleAdvisorId: number;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class FollowUp {
  readonly id: number | null;
  visitId: number;
  nextDate: string;
  nextTime: string | null;
  activity: string;
  observation: string | null;
  responsibleAdvisorId: number;
  completed: boolean;
  completedAt: Date | null;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: FollowUpProps) {
    this.id = props.id;
    this.visitId = props.visitId;
    this.nextDate = props.nextDate;
    this.nextTime = props.nextTime;
    this.activity = props.activity;
    this.observation = props.observation;
    this.responsibleAdvisorId = props.responsibleAdvisorId;
    this.completed = props.completed;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Rules a new follow-up must meet (HU-10 CA-02). Exposed so the visit outcome
   * (HU-09 CA-09) can check them before saving anything.
   */
  static assertSchedulable(
    input: { nextDate: string; activity: string },
    today: string,
  ): void {
    if (input.nextDate < today) {
      throw new ValidationError('nextDate cannot be in the past');
    }
    if (input.activity.trim().length === 0) {
      throw new ValidationError('activity must not be empty');
    }
  }

  static create(input: {
    visitId: number;
    nextDate: string;
    nextTime: string | null;
    activity: string;
    observation: string | null;
    responsibleAdvisorId: number;
  }): FollowUp {
    return new FollowUp({
      id: null,
      visitId: input.visitId,
      nextDate: input.nextDate,
      nextTime: input.nextTime,
      activity: input.activity,
      observation: input.observation,
      responsibleAdvisorId: input.responsibleAdvisorId,
      completed: false,
      completedAt: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  update(input: {
    nextDate?: string;
    activity?: string;
    observation?: string | null;
  }): void {
    if (this.completed) {
      throw new Error('Cannot update a completed follow-up');
    }
    if (input.nextDate !== undefined) this.nextDate = input.nextDate;
    if (input.activity !== undefined) this.activity = input.activity;
    if (input.observation !== undefined) this.observation = input.observation;
  }

  complete(now: Date = new Date()): void {
    if (this.completed) {
      throw new Error('Follow-up already completed');
    }
    this.completed = true;
    this.completedAt = now;
  }
}
