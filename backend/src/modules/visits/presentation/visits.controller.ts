import {
  BadRequestException,
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
import { GetVisitFormUseCase } from '../application/get-visit-form.use-case.js';
import { GetVisitUseCase } from '../application/get-visit.use-case.js';
import { ListVisitsUseCase } from '../application/list-visits.use-case.js';
import { RecordVisitOutcomeUseCase } from '../application/record-visit-outcome.use-case.js';
import { RescheduleVisitUseCase } from '../application/reschedule-visit.use-case.js';
import { ScheduleVisitUseCase } from '../application/schedule-visit.use-case.js';
import { StartVisitUseCase } from '../application/start-visit.use-case.js';
import type { VisitActor } from '../application/types/visit-actor.js';
import { ListVisitsQueryDto } from './dtos/list-visits-query.dto.js';
import { PaginatedVisitsResponseDto } from './dtos/paginated-visits-response.dto.js';
import { RecordVisitOutcomeDto } from './dtos/record-visit-outcome.dto.js';
import { RescheduleVisitDto } from './dtos/reschedule-visit.dto.js';
import { ScheduleVisitDto } from './dtos/schedule-visit.dto.js';
import { StartVisitDto } from './dtos/start-visit.dto.js';
import { StartVisitResponseDto } from './dtos/start-visit-response.dto.js';
import { VisitAgendaEntryResponseDto } from './dtos/visit-agenda-response.dto.js';
import { VisitAgendaQueryDto } from './dtos/visit-agenda-query.dto.js';
import { VisitFormResponseDto } from './dtos/visit-form-response.dto.js';
import { VisitOutcomeResponseDto } from './dtos/visit-outcome-response.dto.js';
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
    private readonly getVisitForm: GetVisitFormUseCase,
    private readonly startVisit: StartVisitUseCase,
    private readonly recordVisitOutcome: RecordVisitOutcomeUseCase,
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
  async schedule(
    @Body() dto: ScheduleVisitDto,
    @CurrentUser() user: AuthUser,
  ): Promise<VisitResponseDto> {
    const visit = await this.scheduleVisit.execute({
      actor: toActor(user),
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
    @CurrentUser() user: AuthUser,
  ): Promise<VisitResponseDto> {
    const visit = await this.rescheduleVisit.execute(
      toActor(user),
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
    @CurrentUser() user: AuthUser,
  ): Promise<VisitResponseDto> {
    const visit = await this.cancelVisit.execute(toActor(user), id);
    return VisitResponseDto.fromDomain(visit);
  }

  @Get(':id/form')
  @Roles(UserRole.Advisor)
  @ApiOperation({
    summary:
      "Pre-filled data for the advisor's visit form (advisor only, their own visit)",
  })
  @ApiOkResponse({ type: VisitFormResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiForbiddenResponse({ description: 'Admin and director do not start visits' })
  @ApiNotFoundResponse({ description: 'Visit does not exist or not visible' })
  async form(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<VisitFormResponseDto> {
    const form = await this.getVisitForm.execute(toActor(user), id);
    return VisitFormResponseDto.fromDomain(form);
  }

  @Post(':id/start')
  @Roles(UserRole.Advisor)
  @ApiOperation({
    summary:
      'Start a scheduled visit, the day it is due (advisor only, their own visit). The backend alone confirms the location',
  })
  @ApiOkResponse({ type: StartVisitResponseDto })
  @ApiBadRequestResponse({
    description:
      'The visit is not scheduled, is not due today, or only one of latitude/longitude was sent',
  })
  @ApiForbiddenResponse({ description: 'Admin and director do not start visits' })
  @ApiNotFoundResponse({ description: 'Visit does not exist or not visible' })
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartVisitDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StartVisitResponseDto> {
    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException(
        'latitude and longitude must be sent together',
      );
    }
    const visit = await this.startVisit.execute(toActor(user), id, {
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });
    return StartVisitResponseDto.fromStart(
      visit,
      this.startVisit.checkInRadiusMeters,
    );
  }

  @Post(':id/outcome')
  @Roles(UserRole.Advisor)
  @ApiOperation({
    summary: 'Record the outcome of a visit (advisor only, their own visit)',
  })
  @ApiOkResponse({ type: VisitOutcomeResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid input, the visit is not scheduled or not due today, an unknown/inactive catalog id, or finishedAt before startedAt',
  })
  @ApiForbiddenResponse({ description: 'Admin and director do not record outcomes' })
  @ApiNotFoundResponse({ description: 'Visit does not exist or not visible' })
  async outcome(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordVisitOutcomeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<VisitOutcomeResponseDto> {
    const result = await this.recordVisitOutcome.execute(toActor(user), id, {
      visitObjectiveId: dto.visitObjectiveId,
      visitTypeId: dto.visitTypeId,
      visitResultId: dto.visitResultId,
      interestLevel: dto.interestLevel,
      interestReason: dto.interestReason ?? null,
      observation: dto.observation,
      competitorMentioned: dto.competitorMentioned ?? null,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null,
      nextFollowUp: dto.nextFollowUp,
    });
    return VisitOutcomeResponseDto.fromOutcome(result);
  }
}
