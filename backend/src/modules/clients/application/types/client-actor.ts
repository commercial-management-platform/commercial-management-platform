import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

/**
 * The authenticated user that requests a client operation. Provided by the
 * auth module (BetterAuth) through the AuthGuard.
 */
export interface ClientActor {
  id: string;
  role: UserRole;
}
