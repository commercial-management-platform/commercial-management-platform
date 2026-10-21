import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';

export function parseRole(roleInput: string): UserRole {
  if (!roleInput || typeof roleInput !== 'string') {
    throw new ValidationError('Role is required and must be a string');
  }
  const normalized = roleInput.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'administrador') {
    return UserRole.Admin;
  }
  if (normalized === 'director' || normalized === 'gerente') {
    return UserRole.Director;
  }
  if (normalized === 'advisor' || normalized === 'asesor') {
    return UserRole.Advisor;
  }
  throw new ValidationError(
    `Invalid role: '${roleInput}'. Allowed roles are ADMINISTRADOR, GERENTE, ASESOR (or admin, director, advisor)`,
  );
}
