import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../domain/types/user-role.enum.js';
import type { AuthUser } from '../../domain/entities/auth-user.entity.js';

export class UserProfileDto {
  @ApiProperty({ example: 'usr_abc123', description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Full name' })
  name: string;

  @ApiProperty({ example: 'carlos@cmp.com', description: 'User email' })
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.Advisor,
    description: 'System role for authorization',
  })
  role: UserRole;

  @ApiProperty({ example: true, description: 'Email verification status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  static fromDomain(user: AuthUser): UserProfileDto {
    const dto = new UserProfileDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.emailVerified = user.emailVerified;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
