import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListClientsQueryDto {
  @ApiPropertyOptional({
    example: 'andina',
    description: 'Search by NIT or business name (partial, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'Filter by active state',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Filter by zone catalog id (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    description: 'Filter by client type catalog id (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientTypeId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 3,
    description: 'Filter by client potential catalog id (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientPotentialId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Filter by client status catalog id (HU-05)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientStatusId?: number;
}
