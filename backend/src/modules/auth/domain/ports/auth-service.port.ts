import { AuthUser } from '../entities/auth-user.entity.js';
import { AuthSession } from '../entities/auth-session.entity.js';
import { UserRole } from '../types/user-role.enum.js';

export const AUTH_SERVICE_PORT = Symbol('AUTH_SERVICE_PORT');

export interface LoginResult {
  user: AuthUser;
  session: AuthSession;
  token: string;
}

export interface SessionVerificationResult {
  user: AuthUser;
  session: AuthSession;
}

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthServicePort {
  signInEmail(email: string, password: string): Promise<LoginResult>;
  signOut(token: string): Promise<void>;
  verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ): Promise<SessionVerificationResult | null>;
  signUpEmail(params: SignUpParams): Promise<LoginResult>;
}
