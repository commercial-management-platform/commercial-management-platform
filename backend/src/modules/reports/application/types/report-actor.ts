import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

/**
 * The authenticated user that requests a report. Always taken from the
 * session (AuthGuard), never from the query.
 */
export interface ReportActor {
  id: string;
  role: UserRole;
}
