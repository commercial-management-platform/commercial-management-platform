import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

/**
 * The authenticated user that requests a contact operation. Always taken from
 * the session (AuthGuard), never from the body or the query.
 */
export interface ContactActor {
  id: string;
  role: UserRole;
}
