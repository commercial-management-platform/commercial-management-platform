export const ADVISOR_PROFILE_PORT = Symbol('ADVISOR_PROFILE_PORT');

export enum AdvisorStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export interface AdvisorProfileData {
  userId: string;
  name: string;
  email: string;
  status: AdvisorStatus;
}

/**
 * Access to the `advisor` table, which links an advisor to its betterAuth user.
 * Records are never deleted: routes and visits reference them.
 */
export interface AdvisorProfilePort {
  /** Creates the advisor record of the user, or updates name, email and status if it exists. */
  save(data: AdvisorProfileData): Promise<void>;
  /** Marks the advisor record of the user as inactive. Does nothing if there is none. */
  deactivate(userId: string): Promise<void>;
}
