import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthUser } from '../../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard.js';
import type { DashboardActor } from '../../application/dashboard-actor.js';
import { GetDashboardKpisUseCase } from '../../application/use-cases/get-dashboard-kpis.use-case.js';
import { ListVisitTrackingUseCase } from '../../application/use-cases/list-visit-tracking.use-case.js';
import {
  DashboardKpisQueryDto,
  VisitTrackingQueryDto,
} from '../dtos/dashboard-query.dto.js';
import {
  DashboardKpisResponseDto,
  PaginatedVisitTrackingResponseDto,
} from '../dtos/dashboard-response.dto.js';

function toActor(user: AuthUser): DashboardActor {
  return { id: user.id, role: user.role };
}

/**
 * Commercial dashboard (HU-15). Read-only; every value is computed here from
 * real data, never in the frontend (CA-01, CA-08).
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@ApiForbiddenResponse({ description: 'The role of the user is not allowed' })
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getKpis: GetDashboardKpisUseCase,
    private readonly listTracking: ListVisitTrackingUseCase,
  ) {}

  @Get('kpis')
  @ApiOperation({
    summary: 'Commercial indicators of a week and of the week before',
    description:
      'Scheduled and completed visits, effectiveness, quoted value, closed orders (confirmed or delivered) and billing. Admin and director filter by week, zone and advisor; an advisor only gets their own (advisorId is ignored).',
  })
  @ApiOkResponse({ type: DashboardKpisResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed or impossible date, or non-numeric id' })
  async kpis(
    @Query() query: DashboardKpisQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DashboardKpisResponseDto> {
    const kpis = await this.getKpis.execute(toActor(user), query);
    return DashboardKpisResponseDto.fromDomain(kpis);
  }

  @Get('tracking')
  @ApiOperation({
    summary: 'Route and visit tracking table, paginated',
    description:
      'Newest visit first, with advisor, zone, route, client, result, quotes, orders and next follow-up. Same filters as GET /reports/visit-tracking/export; without dates, the current week.',
  })
  @ApiOkResponse({ type: PaginatedVisitTrackingResponseDto })
  @ApiBadRequestResponse({
    description: 'Malformed or impossible date, fromDate after toDate, week with fromDate/toDate, or unknown status',
  })
  async tracking(
    @Query() query: VisitTrackingQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedVisitTrackingResponseDto> {
    const page = await this.listTracking.execute(
      toActor(user),
      {
        week: query.week,
        fromDate: query.fromDate,
        toDate: query.toDate,
        zoneId: query.zoneId,
        advisorId: query.advisorId,
        status: query.status,
        search: query.search,
      },
      query.toPageRequest(),
    );
    return PaginatedVisitTrackingResponseDto.fromDomain(page);
  }
}
