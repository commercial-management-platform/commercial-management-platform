import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser } from '../../../auth/domain/entities/auth-user.entity.js';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator.js';
import { AuthGuard } from '../../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard.js';
import { CreateSalesOrderFromQuoteUseCase } from '../../application/use-cases/create-sales-order-from-quote.use-case.js';
import type { SalesOrderActor } from '../../application/types/sales-order-actor.js';
import { CreateSalesOrderFromQuoteDto } from '../dtos/create-sales-order-from-quote.dto.js';
import { SalesOrderResponseDto } from '../dtos/sales-order-response.dto.js';

@ApiTags('sales-orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller('quotes')
export class QuoteSalesOrdersController {
  constructor(
    private readonly createFromQuote: CreateSalesOrderFromQuoteUseCase,
  ) {}
  @Post(':id/sales-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a sales order from a quote. Copies the quote client and value',
  })
  @ApiCreatedResponse({ type: SalesOrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'The quote is not approved, invalid dates, delivery before order date, or visit linkage',
  })
  @ApiConflictResponse({ description: 'The quote already has a sales order' })
  @ApiNotFoundResponse({
    description: 'Quote, visit, or client does not exist or is not visible',
  })
  async create(
    @Param('id', ParseIntPipe) quoteId: number,
    @Body() dto: CreateSalesOrderFromQuoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesOrderResponseDto> {
    const actor: SalesOrderActor = { id: user.id, role: user.role };
    return SalesOrderResponseDto.fromDomain(
      await this.createFromQuote.execute({ actor, quoteId, ...dto }),
    );
  }
}
