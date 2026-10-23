import type { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export interface SalesOrderActor {
  id: string;
  role: UserRole;
}
