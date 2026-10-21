import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { User } from '../../domain/entities/user.entity.js';

export class UserResponseDto {
  @ApiProperty({ example: 'usr_abc123', description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Full name' })
  name: string;

  @ApiProperty({ example: 'carlos@cmp.com', description: 'User email address' })
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.Advisor,
    description: 'Assigned system role (admin, director, advisor)',
  })
  role: UserRole;

  @ApiProperty({
    example: true,
    description: 'Active status of the user account',
  })
  isActive: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether the user email has been verified',
  })
  emailVerified: boolean;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Profile avatar image URL',
    nullable: true,
  })
  image?: string | null;

  @ApiProperty({ description: 'Timestamp when user was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when user was last updated' })
  updatedAt: Date;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.emailVerified = user.emailVerified;
    dto.image = user.image ?? null;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
