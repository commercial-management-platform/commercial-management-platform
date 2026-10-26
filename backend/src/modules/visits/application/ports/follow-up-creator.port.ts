import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export const FOLLOW_UP_CREATOR = Symbol('FOLLOW_UP_CREATOR');

export interface NextFollowUpInput {
  /** YYYY-MM-DD; no puede ser pasada. */
  nextDate: string;
  /** HH:mm, opcional. */
  nextTime?: string | null;
  activity: string;
  observation?: string | null;
}

/**
 * Output port to create a follow-up from a visit as part of recording its
 * outcome (HU-09 CA-09 / HU-10). Owned by visits; implemented by the
 * follow-ups module so both the visit result and the follow-up are created
 * from the same request instead of two independent frontend calls.
 */
export interface FollowUpCreatorPort {
  /** Throws ValidationError if the follow-up could not be created; writes nothing. */
  validate(input: NextFollowUpInput): void;
  create(
    actor: { id: string; role: UserRole },
    visitId: number,
    input: NextFollowUpInput,
  ): Promise<void>;
}
