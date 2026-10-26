import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Client } from '../../domain/entities/client.js';

export class ClientResponseDto {
  @ApiProperty({ example: 1, description: 'Client identifier' })
  id: number;

  @ApiProperty({
    example: '900123456-5',
    description: 'Colombian tax ID (NIT). Unique across the system',
  })
  nit: string;

  @ApiProperty({
    example: 'Distribuidora Andina SAS',
    description: 'Legal business name',
  })
  businessName: string;

  @ApiPropertyOptional({ example: 'Andina', description: 'Trade name' })
  tradeName: string | null;

  @ApiPropertyOptional({
    example: 'Carrera 7 # 72-41',
    description: 'Street address',
  })
  address: string | null;

  @ApiPropertyOptional({ example: 'Bogota D.C.', description: 'Department' })
  department: string | null;

  @ApiPropertyOptional({ example: 'Bogota', description: 'Municipality' })
  municipality: string | null;

  @ApiPropertyOptional({
    example: 'Chapinero',
    description: 'Neighborhood',
  })
  neighborhood: string | null;

  @ApiPropertyOptional({ example: '6015551234', description: 'Phone number' })
  phone: string | null;

  @ApiPropertyOptional({
    example: 'compras@distribuidoraandina.co',
    description: 'Contact email',
  })
  email: string | null;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Zone catalog id (HU-05)',
  })
  zoneId: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    description: 'Client type catalog id (HU-05)',
  })
  clientTypeId: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 3,
    description: 'Client potential catalog id (HU-05)',
  })
  clientPotentialId: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Client status catalog id (HU-05)',
  })
  clientStatusId: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 7,
    description: 'Recommended visit frequency in days',
  })
  visitFrequencyDays: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 4.711,
    description: 'Latitude for the map view (HU-11)',
  })
  latitude: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: -74.0721,
    description: 'Longitude for the map view (HU-11)',
  })
  longitude: number | null;

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

  static fromDomain(client: Client): ClientResponseDto {
    const dto = new ClientResponseDto();
    // The client always comes from persistence, so the id exists.
    dto.id = client.id!;
    dto.nit = client.nit;
    dto.businessName = client.businessName;
    dto.tradeName = client.tradeName;
    dto.address = client.address;
    dto.department = client.department;
    dto.municipality = client.municipality;
    dto.neighborhood = client.neighborhood;
    dto.phone = client.phone;
    dto.email = client.email;
    dto.zoneId = client.zoneId;
    dto.clientTypeId = client.clientTypeId;
    dto.clientPotentialId = client.clientPotentialId;
    dto.clientStatusId = client.clientStatusId;
    dto.visitFrequencyDays = client.visitFrequencyDays;
    dto.latitude = client.latitude;
    dto.longitude = client.longitude;
    dto.active = client.active;
    // The client always comes from persistence, so the timestamps exist.
    dto.createdAt = client.createdAt!;
    dto.updatedAt = client.updatedAt!;
    return dto;
  }
}
