import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { GenerateRouteVisitsUseCase } from '../application/generate-route-visits.use-case.js';
import { GenerateRouteVisitsDto } from './dtos/generate-route-visits.dto.js';
import { GenerateRouteVisitsResponseDto } from './dtos/generate-route-visits-response.dto.js';
import type { VisitActor } from '../application/types/visit-actor.js';

/**
 * Nested under /routes/:routeId/visits (HU-08). Lives in the visits module,
 * not in the routes controller, so routes stays untouched.
 */
@ApiTags('visits')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller('routes/:routeId/visits')
export class RouteVisitsController {
  constructor(
    private readonly generateRouteVisits: GenerateRouteVisitsUseCase,
  ) {}

  @Post()
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Generate the visits of a route for a date (admin and director only)',
  })
  @ApiOkResponse({
    type: GenerateRouteVisitsResponseDto,
    description: 'Visits created, with the clients skipped and why',
  })
  @ApiBadRequestResponse({
    description:
      'The route is inactive, its advisor is inactive, there is no time to use, or the resulting date is in the past',
  })
  @ApiForbiddenResponse({ description: 'Only admin and director can do it' })
  @ApiNotFoundResponse({ description: 'Route does not exist' })
  async generate(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() dto: GenerateRouteVisitsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GenerateRouteVisitsResponseDto> {
    const result = await this.generateRouteVisits.execute(routeId, {
      date: dto.date,
      time: dto.time ?? null,
    }, { id: user.id, role: user.role } satisfies VisitActor);
    return GenerateRouteVisitsResponseDto.fromDomain(result);
  }
}
