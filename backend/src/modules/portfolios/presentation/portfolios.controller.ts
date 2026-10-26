import {
  Controller,
  Delete,
  Get,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import type { ClientActor } from '../../clients/application/types/client-actor.js';
import { ClientResponseDto } from '../../clients/presentation/dtos/client-response.dto.js';
import { AssociateClientUseCase } from '../application/use-cases/associate-client.use-case.js';
import { GetPortfolioClientsUseCase } from '../application/use-cases/get-portfolio-clients.use-case.js';
import { GetPortfolioUseCase } from '../application/use-cases/get-portfolio.use-case.js';
import { RemoveClientUseCase } from '../application/use-cases/remove-client.use-case.js';
import { PortfolioResponseDto } from './dtos/portfolio-response.dto.js';

function toActor(user: AuthUser): ClientActor {
  return { id: user.id, role: user.role };
}

/**
 * Portfolios of clients (HU-06).
 *
 * The list of portfolios is served by the catalogs module (HU-05) at
 * `GET /catalogs/portfolios`: the portfolios are seeded and they have no CRUD,
 * so this controller only reads them and manages the association with the
 * clients.
 */
@ApiTags('portfolios')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('portfolios')
export class PortfoliosController {
  constructor(
    private readonly getPortfolio: GetPortfolioUseCase,
    private readonly getPortfolioClients: GetPortfolioClientsUseCase,
    private readonly associateClient: AssociateClientUseCase,
    private readonly removeClient: RemoveClientUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a portfolio. The list of portfolios is available at GET /catalogs/portfolios',
  })
  @ApiOkResponse({ type: PortfolioResponseDto, description: 'Portfolio found' })
  @ApiNotFoundResponse({ description: 'Portfolio does not exist' })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PortfolioResponseDto> {
    const portfolio = await this.getPortfolio.execute(id);
    return PortfolioResponseDto.fromDomain(portfolio);
  }

  @Get(':id/clients')
  @ApiOperation({
    summary:
      'List the clients associated to a portfolio. Advisors only see the clients on their routes',
  })
  @ApiOkResponse({
    type: [ClientResponseDto],
    description: 'Clients associated to the portfolio',
  })
  @ApiNotFoundResponse({ description: 'Portfolio does not exist' })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async listClients(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientResponseDto[]> {
    const clients = await this.getPortfolioClients.execute({
      actor: toActor(user),
      portfolioId: id,
    });

    return clients.map((client) => ClientResponseDto.fromDomain(client));
  }

  @Post(':id/clients/:clientId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Associate a client to a portfolio (admin and director only)',
  })
  @ApiCreatedResponse({ description: 'Client associated to the portfolio' })
  @ApiBadRequestResponse({
    description: 'An id is not a number, or the portfolio is deactivated',
  })
  @ApiForbiddenResponse({
    description: 'Only admin and director can associate clients',
  })
  @ApiNotFoundResponse({ description: 'Portfolio or client does not exist' })
  @ApiConflictResponse({ description: 'Client already in the portfolio' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async associate(
    @Param('id', ParseIntPipe) id: number,
    @Param('clientId', ParseIntPipe) clientId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    await this.associateClient.execute({
      actor: toActor(user),
      portfolioId: id,
      clientId,
    });

    return { success: true };
  }

  @Delete(':id/clients/:clientId')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary:
      'Remove a client from a portfolio (admin and director only). The client and the portfolio are kept',
  })
  @ApiOkResponse({ description: 'Client removed from the portfolio' })
  @ApiBadRequestResponse({ description: 'An id is not a number' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can remove clients',
  })
  @ApiNotFoundResponse({
    description: 'Portfolio does not exist, or the client is not associated',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('clientId', ParseIntPipe) clientId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    await this.removeClient.execute({
      actor: toActor(user),
      portfolioId: id,
      clientId,
    });

    return { success: true };
  }
}
