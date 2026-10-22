import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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

import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { CancelVisitUseCase } from '../application/cancel-visit.use-case.js';
import { GetVisitAgendaUseCase } from '../application/get-visit-agenda.use-case.js';
import { GetVisitUseCase } from '../application/get-visit.use-case.js';
import { ListVisitsUseCase } from '../application/list-visits.use-case.js';
import { RescheduleVisitUseCase } from '../application/reschedule-visit.use-case.js';
import { ScheduleVisitUseCase } from '../application/schedule-visit.use-case.js';
import type { VisitActor } from '../application/types/visit-actor.js';
import { ListVisitsQueryDto } from './dtos/list-visits-query.dto.js';
import { PaginatedVisitsResponseDto } from './dtos/paginated-visits-response.dto.js';
import { RescheduleVisitDto } from './dtos/reschedule-visit.dto.js';
import { ScheduleVisitDto } from './dtos/schedule-visit.dto.js';
import { VisitAgendaEntryResponseDto } from './dtos/visit-agenda-response.dto.js';
import { VisitAgendaQueryDto } from './dtos/visit-agenda-query.dto.js';
import { VisitResponseDto } from './dtos/visit-response.dto.js';

function toActor(user: AuthUser): VisitActor {
  return { id: user.id, role: user.role };
}

@ApiTags('visits')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller('visits')
export class VisitsController {
  constructor(
    private readonly scheduleVisit: ScheduleVisitUseCase,
    private readonly listVisits: ListVisitsUseCase,
    private readonly getVisitAgenda: GetVisitAgendaUseCase,
    private readonly getVisit: GetVisitUseCase,
    private readonly rescheduleVisit: RescheduleVisitUseCase,
    private readonly cancelVisit: CancelVisitUseCase,
  ) {}

  @Post()
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Schedule a visit (admin and director only)' })
  @ApiOkResponse({ type: VisitResponseDto, description: 'Visit scheduled' })
  @ApiBadRequestResponse({
    description:
      'Invalid input, a past date, or an unknown/inactive client, advisor or route',
  })
  @ApiForbiddenResponse({ description: 'Only admin and director can schedule' })
  async schedule(@Body() dto: ScheduleVisitDto): Promise<VisitResponseDto> {
    const visit = await this.scheduleVisit.execute({
      clientId: dto.clientId,
      advisorId: dto.advisorId,
      scheduledDate: new Date(dto.scheduledDate),
      routeId: dto.routeId ?? null,
    });
    return VisitResponseDto.fromDomain(visit);
  }

  @Get()
  @ApiOperation({
    summary:
      'List visits with filters and pagination. Advisors only see their own visits',
  })
  @ApiOkResponse({ type: PaginatedVisitsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filters, or date and week together' })
  async list(
    @Query() query: ListVisitsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedVisitsResponseDto> {
    const page = await this.listVisits.execute(
      toActor(user),
      {
        date: query.date,
        week: query.week,
        advisorId: query.advisorId,
        zoneId: query.zoneId,
        status: query.status,
      },
      query.toPageRequest(),
    );
    return PaginatedVisitsResponseDto.fromDomain(page);
  }

  @Get('agenda')
  @Roles(UserRole.Advisor)
  @ApiOperation({ summary: "The session advisor's agenda (advisor only)" })
  @ApiOkResponse({ type: [VisitAgendaEntryResponseDto] })
  @ApiForbiddenResponse({ description: 'Admin and director use GET /visits' })
  async agenda(
    @Query() query: VisitAgendaQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<VisitAgendaEntryResponseDto[]> {
    const entries = await this.getVisitAgenda.execute(toActor(user), {
      period: query.period,
      date: query.date,
    });
    return entries.map((entry) => VisitAgendaEntryResponseDto.fromDomain(entry));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a visit by id. Advisors only see their own visits, otherwise 404',
  })
  @ApiOkResponse({ type: VisitResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiNotFoundResponse({ description: 'Visit does not exist or not visible' })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<VisitResponseDto> {
    const visit = await this.getVisit.execute(toActor(user), id);
    return VisitResponseDto.fromDomain(visit);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Reschedule a visit (admin and director only)' })
  @ApiOkResponse({ type: VisitResponseDto })
  @ApiBadRequestResponse({
    description: 'The visit is not scheduled, or the new date is in the past',
  })
  @ApiForbiddenResponse({ description: 'Only admin and director can do it' })
  @ApiNotFoundResponse({ description: 'Visit does not exist' })
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleVisitDto,
  ): Promise<VisitResponseDto> {
    const visit = await this.rescheduleVisit.execute(
      id,
      new Date(dto.scheduledDate),
    );
    return VisitResponseDto.fromDomain(visit);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Cancel a visit (admin and director only)' })
  @ApiOkResponse({ type: VisitResponseDto })
  @ApiBadRequestResponse({ description: 'The visit is not scheduled' })
  @ApiForbiddenResponse({ description: 'Only admin and director can do it' })
  @ApiNotFoundResponse({ description: 'Visit does not exist' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VisitResponseDto> {
    const visit = await this.cancelVisit.execute(id);
    return VisitResponseDto.fromDomain(visit);
  }
}
