import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

/**
 * The authenticated user that requests the history. Always taken from the
 * session (AuthGuard), never from the body or the query.
 */
export interface ActivityLogActor {
  id: string;
  role: UserRole;
}
