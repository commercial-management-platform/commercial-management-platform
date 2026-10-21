import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetCatalogEntryStatusDto {
  @ApiProperty({
    example: false,
    description:
      'Use false to deactivate an entry or true to activate it again.',
  })
  @IsBoolean()
  active: boolean;
}
