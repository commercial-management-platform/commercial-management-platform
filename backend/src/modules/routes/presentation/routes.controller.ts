import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateRouteUseCase } from '../application/create-route.use-case.js';
import { ListRoutesUseCase } from '../application/list-routes.use-case.js';
import { GetRouteUseCase } from '../application/get-route.use-case.js';
import { UpdateRouteUseCase } from '../application/update-route.use-case.js';
import { GetRouteClientsUseCase } from '../application/get-route-clients.use-case.js';
import { AssociateClientUseCase } from '../application/associate-client.use-case.js';
import { RemoveClientUseCase } from '../application/remove-client.use-case.js';
import { ReorderClientsUseCase } from '../application/reorder-clients.use-case.js';
import { CreateRouteDto } from './create-route.dto.js';
import { UpdateRouteDto } from './update-route.dto.js';
import { ReorderRouteClientsDto } from './reorder-route-clients.dto.js';

@ApiTags('routes')
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
  @ApiOperation({ summary: 'Create a route' })
  @ApiResponse({ status: 201 })
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
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List routes' })
  @ApiResponse({ status: 200 })
  async list() {
    return this.listRoutes.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a route by id' })
  @ApiResponse({ status: 200 })
  async get(@Param('id') id: string) {
    return this.getRoute.execute(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a route' })
  @ApiResponse({ status: 200 })
  async update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.updateRoute.execute(Number(id), {
      name: dto.name,
      zoneId: dto.zoneId,
      executionDays: dto.executionDays,
      frequency: dto.frequency,
      suggestedStartTime: dto.suggestedStartTime,
      suggestedEndTime: dto.suggestedEndTime,
      description: dto.description,
      advisorId: dto.advisorId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status,
    });
  }

  @Get(':id/clients')
  @ApiOperation({ summary: 'List clients associated to a route' })
  @ApiResponse({ status: 200 })
  async clients(@Param('id') id: string) {
    return this.getRouteClients.execute(Number(id));
  }

  @Post(':id/clients/:clientId')
  @ApiOperation({ summary: 'Associate a client to a route' })
  @ApiResponse({ status: 201 })
  async associate(@Param('id') id: string, @Param('clientId') clientId: string) {
    await this.associateClient.execute(Number(id), Number(clientId));
    return { success: true };
  }

  @Delete(':id/clients/:clientId')
  @ApiOperation({ summary: 'Remove a client association from a route' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string, @Param('clientId') clientId: string) {
    await this.removeClient.execute(Number(id), Number(clientId));
    return { success: true };
  }

  @Patch(':id/clients/order')
  @ApiOperation({ summary: 'Reorder clients in a route' })
  @ApiResponse({ status: 200 })
  async reorder(@Param('id') id: string, @Body() dto: ReorderRouteClientsDto) {
    const ids =
      dto.clientIds ??
      (dto.items ? [...dto.items].sort((a, b) => a.visitOrder - b.visitOrder).map((i) => i.clientId) : []);
    await this.reorderClients.execute(Number(id), ids);
    if (dto.items) {
      // apply explicit visitOrder values
      // handled by reorder? our reorder assigns sequential; if explicit needed, do here
    }
    return { success: true };
  }
}
