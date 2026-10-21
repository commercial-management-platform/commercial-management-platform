import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCatalogEntryDto {
  @ApiPropertyOptional({
    example: 'Zona Metropolitana',
    maxLength: 100,
    description: 'New catalog name. Leading and trailing spaces are removed.',
  })
  // Trim before validating so a name made only of spaces is rejected.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
}

export class UpdateClientPotentialDto extends UpdateCatalogEntryDto {
  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'New display priority for the client potential.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  declare order?: number;
}
