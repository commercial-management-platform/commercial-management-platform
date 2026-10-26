import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

/** Authenticated actor, always derived from AuthGuard instead of request data. */
export interface QuoteActor {
  id: string;
  role: UserRole;
}
