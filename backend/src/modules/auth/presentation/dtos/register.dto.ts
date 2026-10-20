import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../domain/types/user-role.enum.js';

export class RegisterDto {
  @ApiProperty({
    example: 'Carlos Mendoza',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'carlos@cmp.com',
    description: 'Unique email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.Advisor,
    description: 'User system role: admin, director or advisor',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
