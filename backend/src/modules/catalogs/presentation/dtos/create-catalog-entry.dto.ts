import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateCatalogEntryDto {
  @ApiProperty({
    example: 'Norte',
    maxLength: 100,
    description:
      'Unique catalog name. Leading and trailing spaces are removed.',
  })
  // Trim before validating so a name made only of spaces is rejected.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
