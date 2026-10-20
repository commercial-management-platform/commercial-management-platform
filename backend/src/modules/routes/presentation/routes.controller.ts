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
} from '@nestjs/common';
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
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
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
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.getRoute.execute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a route' })
  @ApiResponse({ status: 200 })
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
  @ApiOperation({ summary: 'List clients associated to a route' })
  @ApiResponse({ status: 200 })
  async clients(@Param('id', ParseIntPipe) id: number) {
    return this.getRouteClients.execute(id);
  }

  @Post(':id/clients/:clientId')
  @ApiOperation({ summary: 'Associate a client to a route' })
  @ApiResponse({ status: 201 })
  async associate(
    @Param('id', ParseIntPipe) id: number,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    await this.associateClient.execute(id, clientId);
    return { success: true };
  }

  @Delete(':id/clients/:clientId')
  @ApiOperation({ summary: 'Remove a client association from a route' })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    await this.removeClient.execute(id, clientId);
    return { success: true };
  }

  @Patch(':id/clients/order')
  @ApiOperation({ summary: 'Reorder clients in a route' })
  @ApiResponse({ status: 200 })
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
