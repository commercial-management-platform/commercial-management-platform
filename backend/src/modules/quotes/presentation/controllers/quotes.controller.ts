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
import { ChangeQuoteStatusUseCase } from '../../application/use-cases/change-quote-status.use-case.js';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case.js';
import { GetQuoteUseCase } from '../../application/use-cases/get-quote.use-case.js';
import { ListQuotesUseCase } from '../../application/use-cases/list-quotes.use-case.js';
import type { QuoteActor } from '../../application/types/quote-actor.js';
import { ChangeQuoteStatusDto } from '../dtos/change-quote-status.dto.js';
import { CreateQuoteDto } from '../dtos/create-quote.dto.js';
import { ListQuotesQueryDto } from '../dtos/list-quotes-query.dto.js';
import { PaginatedQuotesResponseDto } from '../dtos/paginated-quotes-response.dto.js';
import { QuoteDetailResponseDto } from '../dtos/quote-detail-response.dto.js';
import { QuoteResponseDto } from '../dtos/quote-response.dto.js';

function toActor(user: AuthUser): QuoteActor {
  return { id: user.id, role: user.role };
}

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly createQuote: CreateQuoteUseCase,
    private readonly listQuotes: ListQuotesUseCase,
    private readonly getQuote: GetQuoteUseCase,
    private readonly changeQuoteStatus: ChangeQuoteStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a quote. Advisors can only create quotes for clients on their routes',
  })
  @ApiCreatedResponse({ type: QuoteResponseDto, description: 'Quote created' })
  @ApiBadRequestResponse({
    description:
      'Invalid fields, visit linkage, or missing advisorId for admin/director',
  })
  @ApiNotFoundResponse({
    description: 'Client, advisor or visit does not exist or is not visible',
  })
  async create(
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteResponseDto> {
    return QuoteResponseDto.fromDomain(
      await this.createQuote.execute({ actor: toActor(user), ...dto }),
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'List quotes with filters and pagination. Advisors only see clients on their routes',
  })
  @ApiOkResponse({ type: PaginatedQuotesResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query filters or date range' })
  async list(
    @Query() query: ListQuotesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedQuotesResponseDto> {
    return PaginatedQuotesResponseDto.fromDomain(
      await this.listQuotes.execute(
        toActor(user),
        query,
        query.toPageRequest(),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote. Details are introduced by HU-13' })
  @ApiOkResponse({ type: QuoteDetailResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiNotFoundResponse({
    description: 'Quote does not exist or is not visible',
  })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteDetailResponseDto> {
    return QuoteDetailResponseDto.fromDomain(
      await this.getQuote.execute(toActor(user), id),
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Change a quote status (admin and director only)' })
  @ApiOkResponse({ type: QuoteResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid status or forbidden state transition',
  })
  @ApiForbiddenResponse({ description: 'Advisors cannot change quote status' })
  @ApiNotFoundResponse({ description: 'Quote does not exist' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeQuoteStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteResponseDto> {
    return QuoteResponseDto.fromDomain(
      await this.changeQuoteStatus.execute(toActor(user), id, dto.status),
    );
  }
}
