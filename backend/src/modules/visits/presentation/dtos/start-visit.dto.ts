import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

/**
 * The advisor only sends their raw location (or none, if the device could
 * not get it); the backend alone computes whether it confirms the check-in.
 */
export class StartVisitDto {
  @ApiPropertyOptional({ example: 10.9925 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -74.8031 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
