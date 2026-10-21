import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateRouteUseCase } from '../application/create-route.use-case.js';
import { ListRoutesUseCase } from '../application/list-routes.use-case.js';
import { GetRouteUseCase } from '../application/get-route.use-case.js';
import { UpdateRouteUseCase } from '../application/update-route.use-case.js';
import { GetRouteClientsUseCase } from '../application/get-route-clients.use-case.js';
import { AssociateClientUseCase } from '../application/associate-client.use-case.js';
import { RemoveClientUseCase } from '../application/remove-client.use-case.js';
import { ReorderClientsUseCase } from '../application/reorder-clients.use-case.js';
import type { RouteActor } from '../application/types/route-actor.js';
import { CreateRouteDto } from './create-route.dto.js';
import { UpdateRouteDto } from './update-route.dto.js';
import { ReorderRouteClientsDto } from './reorder-route-clients.dto.js';

function toActor(user: AuthUser): RouteActor {
  return { id: user.id, role: user.role };
}

@ApiTags('routes')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller('routes')
export class RoutesController {
  constructor(
    private readonly createRoute: CreateRouteUseCase,
    private readonly listRoutes: ListRoutesUseCase,
    private readonly getRoute: GetRouteUseCase,
    private readonly updateRoute: UpdateRouteUseCase,
    private readonly getRouteClients: GetRouteClientsUseCase,
    private readonly associateClient: AssociateClientUseCase,
    private readonly removeClient: RemoveClientUseCase,
    private readonly reorderClients: ReorderClientsUseCase,
  ) {}

  @Post()
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Create a route (admin and director only)' })
  @ApiCreatedResponse({ description: 'Route created' })
  @ApiBadRequestResponse({
    description: 'Invalid input, or unknown or inactive zone or advisor',
  })
  @ApiForbiddenResponse({ description: 'Only admin and director can create' })
  async create(@Body() dto: CreateRouteDto) {
    return this.createRoute.execute({
      name: dto.name,
      zoneId: dto.zoneId,
      executionDays: dto.executionDays ?? null,
      frequency: dto.frequency ?? null,
      suggestedStartTime: dto.suggestedStartTime ?? null,
      suggestedEndTime: dto.suggestedEndTime ?? null,
      description: dto.description ?? null,
      advisorId: dto.advisorId,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      status: dto.status,
    });
  }

  @Get()
  @ApiOperation({
    summary:
      'List routes. Admin and director see all; advisors only their own routes',
  })
  @ApiOkResponse({ description: 'Routes visible to the session user' })
  async list(@CurrentUser() user: AuthUser) {
    return this.listRoutes.execute(toActor(user));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a route by id. Advisors only see their own routes, otherwise 404',
  })
  @ApiOkResponse({ description: 'Route found' })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiNotFoundResponse({ description: 'Route does not exist or not visible' })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getRoute.execute(toActor(user), id);
  }

  @Patch(':id')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Update a route (admin and director only)' })
  @ApiOkResponse({ description: 'Route updated' })
  @ApiBadRequestResponse({
    description: 'Invalid input, or unknown or inactive zone or advisor',
  })
  @ApiForbiddenResponse({ description: 'Only admin and director can update' })
  @ApiNotFoundResponse({ description: 'Route does not exist' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRouteDto,
  ) {
    return this.updateRoute.execute(id, {
      name: dto.name,
      zoneId: dto.zoneId,
      executionDays: dto.executionDays,
      frequency: dto.frequency,
      suggestedStartTime: dto.suggestedStartTime,
      suggestedEndTime: dto.suggestedEndTime,
      description: dto.description,
      advisorId: dto.advisorId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status,
    });
  }

  @Get(':id/clients')
  @ApiOperation({
    summary:
      'List the clients of a route in visit order. Advisors only for their own routes, otherwise 404',
  })
  @ApiOkResponse({ description: 'Clients of the route' })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiNotFoundResponse({ description: 'Route does not exist or not visible' })
  async clients(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getRouteClients.execute(toActor(user), id);
  }

  @Post(':id/clients/:clientId')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Associate a client to a route (admin and director only)',
  })
  @ApiCreatedResponse({ description: 'Client associated' })
  @ApiBadRequestResponse({ description: 'An id is not a number' })
  @ApiForbiddenResponse({ description: 'Only admin and director can do it' })
  @ApiNotFoundResponse({ description: 'Route or client does not exist' })
  @ApiConflictResponse({ description: 'Client already on the route' })
  async associate(
    @Param('id', ParseIntPipe) id: number,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    await this.associateClient.execute(id, clientId);
    return { success: true };
  }

  @Delete(':id/clients/:clientId')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Remove a client from a route (admin and director only)',
  })
  @ApiOkResponse({ description: 'Client removed from the route' })
  @ApiBadRequestResponse({ description: 'An id is not a number' })
  @ApiForbiddenResponse({ description: 'Only admin and director can do it' })
  @ApiNotFoundResponse({ description: 'Route or association does not exist' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    await this.removeClient.execute(id, clientId);
    return { success: true };
  }

  @Patch(':id/clients/order')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Reorder the clients of a route (admin and director only)',
  })
  @ApiOkResponse({ description: 'Visit order saved' })
  @ApiBadRequestResponse({
    description:
      'Invalid body, or the order does not list every client of the route exactly once',
  })
  @ApiForbiddenResponse({ description: 'Only admin and director can do it' })
  @ApiNotFoundResponse({ description: 'Route does not exist' })
  @ApiConflictResponse({ description: 'Visit order taken concurrently' })
  async reorder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderRouteClientsDto,
  ) {
    if ((dto.items === undefined) === (dto.clientIds === undefined)) {
      throw new BadRequestException('Send either clientIds or items');
    }
    const items =
      dto.items ??
      dto.clientIds!.map((clientId, index) => ({
        clientId,
        visitOrder: index + 1,
      }));
    await this.reorderClients.execute(id, items);
    return { success: true };
  }
}
