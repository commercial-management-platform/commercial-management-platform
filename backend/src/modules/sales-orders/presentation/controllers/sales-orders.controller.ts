import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { ChangeSalesOrderStatusUseCase } from '../../application/use-cases/change-sales-order-status.use-case.js';
import { CreateSalesOrderUseCase } from '../../application/use-cases/create-sales-order.use-case.js';
import { GetSalesOrderUseCase } from '../../application/use-cases/get-sales-order.use-case.js';
import { ListSalesOrdersUseCase } from '../../application/use-cases/list-sales-orders.use-case.js';
import type { SalesOrderActor } from '../../application/types/sales-order-actor.js';
import { ChangeSalesOrderStatusDto } from '../dtos/change-sales-order-status.dto.js';
import { CreateSalesOrderDto } from '../dtos/create-sales-order.dto.js';
import { ListSalesOrdersQueryDto } from '../dtos/list-sales-orders-query.dto.js';
import { PaginatedSalesOrdersResponseDto } from '../dtos/paginated-sales-orders-response.dto.js';
import { SalesOrderResponseDto } from '../dtos/sales-order-response.dto.js';

const toActor = (user: AuthUser): SalesOrderActor => ({
  id: user.id,
  role: user.role,
});

@ApiTags('sales-orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(
    private readonly createOrder: CreateSalesOrderUseCase,
    private readonly listOrders: ListSalesOrdersUseCase,
    private readonly getOrder: GetSalesOrderUseCase,
    private readonly changeStatus: ChangeSalesOrderStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a sales order. Advisors can only create orders for clients on their routes',
  })
  @ApiCreatedResponse({ type: SalesOrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid fields, delivery before order date, visit linkage, or missing advisorId for admin/director',
  })
  @ApiNotFoundResponse({
    description: 'Client, advisor, or visit does not exist or is not visible',
  })
  async create(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesOrderResponseDto> {
    return SalesOrderResponseDto.fromDomain(
      await this.createOrder.execute({ actor: toActor(user), ...dto }),
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'List sales orders with filters and pagination. Advisors only see clients on their routes',
  })
  @ApiOkResponse({ type: PaginatedSalesOrdersResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query filters or date range' })
  async list(
    @Query() query: ListSalesOrdersQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedSalesOrdersResponseDto> {
    return PaginatedSalesOrdersResponseDto.fromDomain(
      await this.listOrders.execute(
        toActor(user),
        query,
        query.toPageRequest(),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sales order' })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  @ApiBadRequestResponse({ description: 'The sales order id is not a number' })
  @ApiNotFoundResponse({
    description: 'Sales order does not exist or is not visible',
  })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesOrderResponseDto> {
    return SalesOrderResponseDto.fromDomain(
      await this.getOrder.execute(toActor(user), id),
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Change a sales order status (admin and director only)',
  })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid status or forbidden state transition',
  })
  @ApiForbiddenResponse({
    description: 'Advisors cannot change sales order status',
  })
  @ApiNotFoundResponse({ description: 'Sales order does not exist' })
  @ApiConflictResponse({
    description: 'The sales order status was changed concurrently',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeSalesOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesOrderResponseDto> {
    return SalesOrderResponseDto.fromDomain(
      await this.changeStatus.execute(toActor(user), id, dto.status),
    );
  }
}
