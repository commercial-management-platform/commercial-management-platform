import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
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
import { AddQuoteDetailUseCase } from '../../application/use-cases/add-quote-detail.use-case.js';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case.js';
import { GetQuoteUseCase } from '../../application/use-cases/get-quote.use-case.js';
import { ListQuotesUseCase } from '../../application/use-cases/list-quotes.use-case.js';
import { ListQuoteDetailsUseCase } from '../../application/use-cases/list-quote-details.use-case.js';
import { RemoveQuoteDetailUseCase } from '../../application/use-cases/remove-quote-detail.use-case.js';
import { UpdateQuoteDetailUseCase } from '../../application/use-cases/update-quote-detail.use-case.js';
import type { QuoteActor } from '../../application/types/quote-actor.js';
import { ChangeQuoteStatusDto } from '../dtos/change-quote-status.dto.js';
import { CreateQuoteDto } from '../dtos/create-quote.dto.js';
import { ListQuotesQueryDto } from '../dtos/list-quotes-query.dto.js';
import { PaginatedQuotesResponseDto } from '../dtos/paginated-quotes-response.dto.js';
import { CreateQuoteDetailDto } from '../dtos/create-quote-detail.dto.js';
import { QuoteDetailResponseDto } from '../dtos/quote-detail-response.dto.js';
import { QuoteResponseDto } from '../dtos/quote-response.dto.js';
import { QuoteWithDetailsResponseDto } from '../dtos/quote-with-details-response.dto.js';
import { UpdateQuoteDetailDto } from '../dtos/update-quote-detail.dto.js';

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
    private readonly listQuoteDetails: ListQuoteDetailsUseCase,
    private readonly addQuoteDetail: AddQuoteDetailUseCase,
    private readonly updateQuoteDetail: UpdateQuoteDetailUseCase,
    private readonly removeQuoteDetail: RemoveQuoteDetailUseCase,
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

  @Get(':id/details')
  @ApiOperation({ summary: 'List the details of a quote' })
  @ApiOkResponse({ type: [QuoteDetailResponseDto] })
  @ApiBadRequestResponse({ description: 'The quote id is not a number' })
  @ApiNotFoundResponse({
    description: 'Quote does not exist or is not visible',
  })
  async listDetails(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteDetailResponseDto[]> {
    const details = await this.listQuoteDetails.execute(toActor(user), id);
    return details.map((detail) => QuoteDetailResponseDto.fromDomain(detail));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote with its details' })
  @ApiOkResponse({ type: QuoteWithDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiNotFoundResponse({
    description: 'Quote does not exist or is not visible',
  })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteWithDetailsResponseDto> {
    const actor = toActor(user);
    const quote = await this.getQuote.execute(actor, id);
    const details = await this.listQuoteDetails.execute(actor, id);
    return QuoteWithDetailsResponseDto.fromDomain(quote, details);
  }

  @Post(':id/details')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Add a product to a draft quote. Advisors only for clients on their routes',
  })
  @ApiCreatedResponse({ type: QuoteDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid product, quantity, price, amount too large, or quote not in draft',
  })
  @ApiNotFoundResponse({
    description: 'Quote does not exist or is not visible',
  })
  async addDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateQuoteDetailDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteDetailResponseDto> {
    return QuoteDetailResponseDto.fromDomain(
      await this.addQuoteDetail.execute(toActor(user), id, dto),
    );
  }

  @Patch(':id/details/:detailId')
  @ApiOperation({
    summary:
      'Change detail quantity or price of a draft quote. Advisors only for clients on their routes',
  })
  @ApiOkResponse({ type: QuoteDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid quantity, price, amount too large, empty update, or quote not in draft',
  })
  @ApiNotFoundResponse({
    description: 'Quote or detail does not exist or is not visible',
  })
  async updateDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('detailId', ParseIntPipe) detailId: number,
    @Body() dto: UpdateQuoteDetailDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteDetailResponseDto> {
    return QuoteDetailResponseDto.fromDomain(
      await this.updateQuoteDetail.execute(toActor(user), id, detailId, dto),
    );
  }

  @Delete(':id/details/:detailId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Remove a detail from a draft quote. Advisors only for clients on their routes',
  })
  @ApiNoContentResponse({ description: 'Quote detail removed' })
  @ApiBadRequestResponse({ description: 'The quote is not in draft' })
  @ApiNotFoundResponse({
    description: 'Quote or detail does not exist or is not visible',
  })
  async removeDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('detailId', ParseIntPipe) detailId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.removeQuoteDetail.execute(toActor(user), id, detailId);
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
