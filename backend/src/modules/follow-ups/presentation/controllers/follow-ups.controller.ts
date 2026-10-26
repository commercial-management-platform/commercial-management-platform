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
import { AuthUser } from '../../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard.js';
import { CreateFollowUpUseCase } from '../../application/use-cases/create-follow-up.use-case.js';
import { ListFollowUpsUseCase } from '../../application/use-cases/list-follow-ups.use-case.js';
import { GetFollowUpUseCase } from '../../application/use-cases/get-follow-up.use-case.js';
import { UpdateFollowUpUseCase } from '../../application/use-cases/update-follow-up.use-case.js';
import { CompleteFollowUpUseCase } from '../../application/use-cases/complete-follow-up.use-case.js';
import { CreateFollowUpDto } from '../dtos/create-follow-up.dto.js';
import { UpdateFollowUpDto } from '../dtos/update-follow-up.dto.js';
import { ListFollowUpsQueryDto } from '../dtos/list-follow-ups-query.dto.js';
import { FollowUpResponseDto } from '../dtos/follow-up-response.dto.js';
import { PaginatedFollowUpsResponseDto } from '../dtos/paginated-follow-ups-response.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvisorOrmEntity } from '../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';

function toActor(user: AuthUser, advisorId?: number) {
  return { id: user.id, role: user.role, advisorId };
}

@ApiTags('follow-ups')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller()
export class FollowUpsController {
  constructor(
    private readonly createFollowUp: CreateFollowUpUseCase,
    private readonly listFollowUps: ListFollowUpsUseCase,
    private readonly getFollowUp: GetFollowUpUseCase,
    private readonly updateFollowUp: UpdateFollowUpUseCase,
    private readonly completeFollowUp: CompleteFollowUpUseCase,
    @InjectRepository(AdvisorOrmEntity)
    private readonly advisorRepo: Repository<AdvisorOrmEntity>,
  ) {}

  private async resolveAdvisorId(user: AuthUser): Promise<number | undefined> {
    if (user.role !== UserRole.Advisor) return undefined;
    const adv = await this.advisorRepo.findOne({ where: { userId: user.id } });
    return adv?.id;
  }

  @Post('visits/:id/follow-ups')
  @Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
  @ApiOperation({ summary: 'Create a follow-up from a visit' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input or past date' })
  @ApiNotFoundResponse({ description: 'Visit not found' })
  async create(
    @Param('id', ParseIntPipe) visitId: number,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FollowUpResponseDto> {
    const advisorId = await this.resolveAdvisorId(user);
    const fu = await this.createFollowUp.execute(toActor(user, advisorId), visitId, {
      nextDate: dto.nextDate,
      nextTime: dto.nextTime ?? null,
      activity: dto.activity,
      observation: dto.observation ?? null,
      responsibleAdvisorId: dto.responsibleAdvisorId,
    });
    return FollowUpResponseDto.fromDomain(fu);
  }

  @Get('follow-ups')
  @Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
  @ApiOperation({ summary: 'List follow-ups with filters and pagination' })
  @ApiOkResponse({ type: PaginatedFollowUpsResponseDto })
  async list(
    @Query() query: ListFollowUpsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedFollowUpsResponseDto> {
    const advisorId = await this.resolveAdvisorId(user);
    const page = await this.listFollowUps.execute(
      toActor(user, advisorId),
      {
        status: query.status,
        advisorId: query.advisorId,
        from: query.from,
        to: query.to,
      },
      query.toPageRequest(),
    );
    return PaginatedFollowUpsResponseDto.fromDomain(page);
  }

  @Get('follow-ups/:id')
  @Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
  @ApiOperation({ summary: 'Get a follow-up by id' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiNotFoundResponse({ description: 'Follow-up not found' })
  async get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser): Promise<FollowUpResponseDto> {
    const advisorId = await this.resolveAdvisorId(user);
    const fu = await this.getFollowUp.execute(toActor(user, advisorId), id);
    return FollowUpResponseDto.fromDomain(fu);
  }

  @Patch('follow-ups/:id')
  @Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
  @ApiOperation({ summary: 'Update a pending follow-up (date, activity, observation)' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiBadRequestResponse({ description: 'Cannot update completed follow-up or past date' })
  @ApiNotFoundResponse({ description: 'Follow-up not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFollowUpDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FollowUpResponseDto> {
    const advisorId = await this.resolveAdvisorId(user);
    const fu = await this.updateFollowUp.execute(toActor(user, advisorId), id, {
      nextDate: dto.nextDate,
      activity: dto.activity,
      observation: dto.observation,
    });
    return FollowUpResponseDto.fromDomain(fu);
  }

  @Patch('follow-ups/:id/complete')
  @Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
  @ApiOperation({ summary: 'Mark follow-up as completed' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiNotFoundResponse({ description: 'Follow-up not found' })
  async complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser): Promise<FollowUpResponseDto> {
    const advisorId = await this.resolveAdvisorId(user);
    const fu = await this.completeFollowUp.execute(toActor(user, advisorId), id);
    return FollowUpResponseDto.fromDomain(fu);
  }
}
