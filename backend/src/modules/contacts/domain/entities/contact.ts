/**
 * Contact of a client (HU-04).
 *
 * A contact belongs to exactly one client and is never physically deleted:
 * `active` flags a deactivated contact so the commercial history is kept.
 *
 * `isPrimary` marks the main contact of the client. The repository
 * guarantees that a client has at most one primary contact: setting it
 * clears the previous one inside the same transaction.
 */
export interface ContactProps {
  id: number | null;
  /** Client the contact belongs to. */
  clientId: number;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  /** True when this is the main contact of the client. */
  isPrimary: boolean;
  /** False means deactivated (soft delete, history preserved). */
  active: boolean;
  /** Set by the database on insert; null until the contact is saved. */
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Contact {
  readonly id: number | null;
  clientId: number;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  isPrimary: boolean;
  active: boolean;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: ContactProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.name = props.name;
    this.jobTitle = props.jobTitle;
    this.phone = props.phone;
    this.mobile = props.mobile;
    this.email = props.email;
    this.isPrimary = props.isPrimary;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
