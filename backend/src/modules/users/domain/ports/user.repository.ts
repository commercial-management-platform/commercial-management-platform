import { User } from '../entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserFilterOptions {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface UpdateUserData {
  name?: string;
  image?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserRepository {
  findAll(options?: UserFilterOptions): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  countActiveAdmins(): Promise<number>;
  update(id: string, data: UpdateUserData): Promise<User>;
}
