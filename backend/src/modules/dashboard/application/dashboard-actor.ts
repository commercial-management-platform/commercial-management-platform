import { UserRole } from '../../auth/domain/types/user-role.enum.js';

/**
 * The authenticated user that reads the dashboard. Always taken from the
 * session (AuthGuard), never from the query.
 */
export interface DashboardActor {
  id: string;
  role: UserRole;
}

/**
 * Admin and director see every advisor and may filter by one; an advisor only
 * sees their own data, whatever advisorId they send (CA-03), the same rule as
 * GET /visits.
 */
export function advisorScope(
  actor: DashboardActor,
  advisorId: number | undefined,
): { advisorId?: number; advisorUserId?: string } {
  return actor.role === UserRole.Advisor
    ? { advisorUserId: actor.id }
    : { advisorId };
}
