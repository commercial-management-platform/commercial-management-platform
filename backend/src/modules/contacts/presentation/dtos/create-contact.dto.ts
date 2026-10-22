import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_PATTERN = /^[0-9+()\s.-]{7,30}$/;

export class CreateContactDto {
  @ApiProperty({
    example: 'María Fernanda Gómez',
    description: 'Full name of the contact',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'Gerente de Compras',
    description: 'Job title of the contact',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({
    example: '6015551234',
    description: 'Landline phone number. At least one of phone, mobile or email is required',
  })
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, {
    message:
      'phone must be a valid phone number (7 to 30 characters: digits, spaces, +, -, ( and .)',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: '3105551234',
    description: 'Mobile phone number. At least one of phone, mobile or email is required',
  })
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, {
    message:
      'mobile must be a valid phone number (7 to 30 characters: digits, spaces, +, -, ( and .)',
  })
  mobile?: string;

  @ApiPropertyOptional({
    example: 'compras@distribuidoraandina.co',
    description: 'Email address of the contact. At least one of phone, mobile or email is required',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Marks the contact as the main one of the client. The previous primary contact is demoted in the same transaction',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
