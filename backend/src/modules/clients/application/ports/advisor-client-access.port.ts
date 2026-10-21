export const ADVISOR_CLIENT_ACCESS = Symbol('ADVISOR_CLIENT_ACCESS');

export interface AdvisorClientAccessPort {
  canAccess(userId: string, clientId: number): Promise<boolean>;
  getAccessibleClientIds(userId: string): Promise<number[]>;
}
