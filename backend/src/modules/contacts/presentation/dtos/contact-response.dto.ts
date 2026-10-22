import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Contact } from '../../domain/entities/contact.js';

export class ContactResponseDto {
  @ApiProperty({ example: 1, description: 'Contact identifier' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the client the contact belongs to',
  })
  clientId: number;

  @ApiProperty({
    example: 'María Fernanda Gómez',
    description: 'Full name of the contact',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Gerente de Compras',
    description: 'Job title of the contact',
  })
  jobTitle: string | null;

  @ApiPropertyOptional({
    example: '6015551234',
    description: 'Landline phone number',
  })
  phone: string | null;

  @ApiPropertyOptional({
    example: '3105551234',
    description: 'Mobile phone number',
  })
  mobile: string | null;

  @ApiPropertyOptional({
    example: 'compras@distribuidoraandina.co',
    description: 'Email address of the contact',
  })
  email: string | null;

  @ApiProperty({
    example: true,
    description:
      'True when this is the main contact of the client. A client has at most one primary contact',
  })
  isPrimary: boolean;

  @ApiProperty({
    example: true,
    description:
      'Active state. false means deactivated (soft delete, history preserved)',
  })
  active: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  static fromDomain(contact: Contact): ContactResponseDto {
    const dto = new ContactResponseDto();
    // The contact always comes from persistence, so the id exists.
    dto.id = contact.id!;
    dto.clientId = contact.clientId;
    dto.name = contact.name;
    dto.jobTitle = contact.jobTitle;
    dto.phone = contact.phone;
    dto.mobile = contact.mobile;
    dto.email = contact.email;
    dto.isPrimary = contact.isPrimary;
    dto.active = contact.active;
    // The contact always comes from persistence, so the timestamps exist.
    dto.createdAt = contact.createdAt!;
    dto.updatedAt = contact.updatedAt!;
    return dto;
  }
}
