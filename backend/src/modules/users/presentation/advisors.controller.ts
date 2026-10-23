import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { ListAdvisorsUseCase } from '../application/use-cases/list-advisors.use-case.js';
import { AdvisorResponseDto } from './dtos/advisor-response.dto.js';
import { AdvisorQueryDto } from './dtos/advisor-query.dto.js';

// Advisors as assignable people (advisor table). Admin and director need them
// to assign routes, visits, quotes and orders; /users stays admin only.
@ApiTags('advisors')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Director)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Only admin and director' })
@Controller('advisors')
export class AdvisorsController {
  constructor(private readonly listAdvisorsUseCase: ListAdvisorsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'List advisors sorted by name (active only by default)',
  })
  @ApiOkResponse({ type: [AdvisorResponseDto] })
  async listAdvisors(
    @Query() query: AdvisorQueryDto,
  ): Promise<AdvisorResponseDto[]> {
    const advisors = await this.listAdvisorsUseCase.execute(
      query.includeInactive === true,
    );
    return advisors.map(AdvisorResponseDto.fromDomain);
  }
}
