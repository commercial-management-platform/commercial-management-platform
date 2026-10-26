import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NIT_PATTERN } from '../../domain/entities/client.js';

const NIT_INVALID_MESSAGE =
  'nit must be a valid Colombian NIT: 9 to 10 digits with an optional hyphen';

/**
 * Partial update of the allowed client fields. Omit a field to keep it;
 * send null on nullable fields to clear them. The NIT and the business
 * name can only be replaced by a valid non-empty value, never null.
 */
export class UpdateClientDto {
  @ApiPropertyOptional({
    example: '900123456-5',
    description:
      'Colombian tax ID (NIT). Unique across the system; a repeated NIT returns 409',
  })
  @ValidateIf((dto) => dto.nit !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(NIT_PATTERN, { message: NIT_INVALID_MESSAGE })
  nit?: string;

  @ApiPropertyOptional({
    example: 'Distribuidora Andina SAS',
    description: 'Legal business name',
  })
  @ValidateIf((dto) => dto.businessName !== undefined)
  @IsString()
  @IsNotEmpty()
  businessName?: string;

  @ApiPropertyOptional({ example: 'Andina', description: 'Trade name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tradeName?: string | null;

  @ApiPropertyOptional({
    example: 'Carrera 7 # 72-41',
    description: 'Street address',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string | null;

  @ApiPropertyOptional({ example: 'Bogota D.C.', description: 'Department' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  department?: string | null;

  @ApiPropertyOptional({ example: 'Bogota', description: 'Municipality' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  municipality?: string | null;

  @ApiPropertyOptional({
    example: 'Chapinero',
    description: 'Neighborhood',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  neighborhood?: string | null;

  @ApiPropertyOptional({ example: '6015551234', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'compras@distribuidoraandina.co',
    description: 'Contact email',
  })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Zone catalog id. Must reference a valid zone (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId?: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    description: 'Client type catalog id. Must reference a valid type (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientTypeId?: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 3,
    description:
      'Client potential catalog id. Must reference a valid potential (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientPotentialId?: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description:
      'Client status catalog id. Must reference a valid status (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientStatusId?: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 7,
    description: 'Recommended visit frequency in days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  visitFrequencyDays?: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 4.711,
    description: 'Latitude for the map view, between -90 and 90 (HU-11)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: -74.0721,
    description: 'Longitude for the map view, between -180 and 180 (HU-11)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}
