import { ApiProperty } from '@nestjs/swagger';
import type { DatabaseStatus, HealthStatus } from '../domain/health-status.js';

export class HealthResponseDto implements HealthStatus {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: 'ok' | 'error';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database: DatabaseStatus;
}
