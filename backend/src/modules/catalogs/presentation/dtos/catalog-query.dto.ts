import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class CatalogQueryDto {
  @ApiPropertyOptional({
    description:
      'Include inactive entries. Only honored for the admin role; other roles always get active entries only.',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includeInactive?: boolean;
}
