export const ADVISOR_LOOKUP = Symbol('ADVISOR_LOOKUP');

/**
 * Read-only access to the advisor table (HU-02). The users module does not
 * expose an advisor query, so routes owns this port.
 */
export interface AdvisorLookupPort {
  /** True when `advisorId` exists in advisor and its status is active. */
  isActive(advisorId: number): Promise<boolean>;
}
