import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { GetClientActivityUseCase } from '../application/use-cases/get-client-activity.use-case.js';
import { PaginatedActivityLogResponseDto } from './dtos/activity-log-response.dto.js';
import { ClientActivityQueryDto } from './dtos/client-activity-query.dto.js';

/**
 * History of a client (HU-16). Read-only: entries are recorded by the other
 * modules through the shared ActivityLogPort, never through this API.
 */
@ApiTags('activity-log')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
@Controller('clients/:clientId/activity')
export class ClientActivityController {
  constructor(private readonly getClientActivity: GetClientActivityUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'History of actions on a client, newest first',
    description:
      'Paginated, filterable by action and by a range of days (business time). Admin and director see every client; an advisor only the clients on their routes. Feeds the "Últimas interacciones" section of the client card.',
  })
  @ApiParam({ name: 'clientId', type: Number, example: 10 })
  @ApiOkResponse({
    type: PaginatedActivityLogResponseDto,
    description: 'Page of history entries of the client',
  })
  @ApiBadRequestResponse({
    description:
      'clientId is not a number, invalid action, malformed date, from after to, or invalid page/limit',
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing, invalid or expired betterAuth session (Authorization: Bearer <token>)',
  })
  @ApiForbiddenResponse({ description: 'The role of the user is not allowed' })
  @ApiNotFoundResponse({
    description:
      'The client does not exist or, for an advisor, is not on their routes',
  })
  async list(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Query() query: ClientActivityQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedActivityLogResponseDto> {
    const page = await this.getClientActivity.execute(
      {
        actor: { id: user.id, role: user.role },
        clientId,
        action: query.action,
        from: query.from,
        to: query.to,
      },
      query.toPageRequest(),
    );
    return PaginatedActivityLogResponseDto.fromDomain(page);
  }
}
