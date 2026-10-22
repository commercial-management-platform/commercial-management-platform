import { User } from '../domain/entities/user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import {
  AdvisorProfilePort,
  AdvisorStatus,
} from './ports/advisor-profile.port.js';

/**
 * Keeps the advisor record in line with the user: an active advisor user has an
 * active record; any other role or a deactivated account leaves it inactive.
 */
export async function syncAdvisorProfile(
  advisorProfiles: AdvisorProfilePort,
  user: User,
): Promise<void> {
  if (user.role !== UserRole.Advisor) {
    await advisorProfiles.deactivate(user.id);
    return;
  }

  await advisorProfiles.save({
    userId: user.id,
    name: user.name,
    email: user.email,
    status: user.isActive ? AdvisorStatus.Active : AdvisorStatus.Inactive,
  });
}
