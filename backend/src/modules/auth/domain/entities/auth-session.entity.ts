export interface AuthSessionProps {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuthSession {
  readonly id: string;
  readonly token: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;

  constructor(props: AuthSessionProps) {
    this.id = props.id;
    this.token = props.token;
    this.userId = props.userId;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
  }

  isExpired(): boolean {
    return this.expiresAt.getTime() <= Date.now();
  }
}
