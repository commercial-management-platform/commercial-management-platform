import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by role: ADMINISTRADOR, GERENTE, ASESOR (or admin, director, advisor)',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description:
      'Filter by account status (true for active, false for inactive)',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search string to filter by user name or email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
