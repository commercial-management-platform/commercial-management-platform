export interface VisitOutcomeProps {
  id: number | null;
  visitId: number;
  visitResultId: number;
  observation: string;
  /** Set by the database on insert; null until the outcome is saved. */
  createdAt: Date | null;
}

/** Result recorded for a visit (HU-09). At most one per visit. */
export class VisitOutcome {
  readonly id: number | null;
  readonly visitId: number;
  visitResultId: number;
  observation: string;
  readonly createdAt: Date | null;

  constructor(props: VisitOutcomeProps) {
    this.id = props.id;
    this.visitId = props.visitId;
    this.visitResultId = props.visitResultId;
    this.observation = props.observation;
    this.createdAt = props.createdAt;
  }

  /** A new outcome, not saved yet. */
  static record(input: {
    visitId: number;
    visitResultId: number;
    observation: string;
  }): VisitOutcome {
    return new VisitOutcome({ id: null, ...input, createdAt: null });
  }
}
