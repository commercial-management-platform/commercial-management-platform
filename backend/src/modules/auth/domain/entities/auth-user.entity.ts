import { UserRole } from '../types/user-role.enum.js';

export interface AuthUserProps {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  banned?: boolean;
}

export class AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly banned: boolean;

  constructor(props: AuthUserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.role = props.role;
    this.emailVerified = props.emailVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.banned = props.banned ?? false;
  }
}
