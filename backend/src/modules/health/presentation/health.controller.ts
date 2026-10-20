import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CheckHealthUseCase } from '../application/check-health.use-case.js';
import { HealthResponseDto } from './health-response.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly checkHealth: CheckHealthUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Check that the API and the database are up' })
  @ApiOkResponse({
    type: HealthResponseDto,
    example: { status: 'ok', database: 'up' },
  })
  @ApiServiceUnavailableResponse({
    type: HealthResponseDto,
    description: 'The database did not answer SELECT 1',
    example: { status: 'error', database: 'down' },
  })
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponseDto> {
    const health = await this.checkHealth.execute();
    if (health.database === 'down') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }
}
