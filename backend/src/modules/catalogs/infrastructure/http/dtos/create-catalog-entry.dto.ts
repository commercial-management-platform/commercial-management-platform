import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCatalogEntryDto {
  @ApiProperty({
    example: 'Norte',
    description:
      'Unique catalog name. Leading and trailing spaces are removed.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateClientPotentialDto extends CreateCatalogEntryDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Display priority for the client potential.',
  })
  @IsInt()
  @Min(1)
  declare order: number;
}
