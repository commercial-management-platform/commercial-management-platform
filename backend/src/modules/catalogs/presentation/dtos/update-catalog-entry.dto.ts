import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCatalogEntryDto {
  @ApiPropertyOptional({
    example: 'Zona Metropolitana',
    description: 'New catalog name. Leading and trailing spaces are removed.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
