import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export interface UserActor {
  id: string;
  role: UserRole;
}