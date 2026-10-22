import {
  Body,
  Controller,
  Get,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CreateCatalogEntryUseCase } from '../application/use-cases/create-catalog-entry.use-case.js';
import { GetCatalogEntriesUseCase } from '../application/use-cases/get-catalog-entries.use-case.js';
import { SetCatalogEntryStatusUseCase } from '../application/use-cases/set-catalog-entry-status.use-case.js';
import { UpdateCatalogEntryUseCase } from '../application/use-cases/update-catalog-entry.use-case.js';
import type { CatalogType } from '../domain/repositories/catalog.repository.js';
import { CatalogQueryDto } from './dtos/catalog-query.dto.js';
import { CreateCatalogEntryDto } from './dtos/create-catalog-entry.dto.js';
import { SetCatalogEntryStatusDto } from './dtos/set-catalog-entry-status.dto.js';
import { UpdateCatalogEntryDto } from './dtos/update-catalog-entry.dto.js';

// Any authenticated user can read the active entries; only the admin can list
// inactive ones (?includeInactive=true) and write.
@ApiTags('Catalogs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@Controller('catalogs')
export class CatalogsController {
  constructor(
    private readonly getCatalogEntriesUseCase: GetCatalogEntriesUseCase,
    private readonly createCatalogEntryUseCase: CreateCatalogEntryUseCase,
    private readonly updateCatalogEntryUseCase: UpdateCatalogEntryUseCase,
    private readonly setCatalogEntryStatusUseCase: SetCatalogEntryStatusUseCase,
  ) {}

  @Get('zones')
  @ApiOperation({ summary: 'List zones' })
  @ApiOkResponse({ description: 'Returns zones ordered by name.' })
  async getZones(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('zone', query, user);
  }

  @Post('zones')
  @Roles(UserRole.Admin)
  @ApiForbiddenResponse({
    description: 'Insufficient permissions (Admin role required)',
  })
  @ApiOperation({
    summary: 'Create a zone',
    description: 'Example body: { "name": "Norte" }',
  })
  @ApiOkResponse({ description: 'Zone created successfully.' })
  @ApiBadRequestResponse({ description: 'The request body is invalid.' })
  @ApiConflictResponse({ description: 'A zone with this name already exists.' })
  async createZone(@Body() dto: CreateCatalogEntryDto) {
    return this.createCatalogEntryUseCase.execute('zone', dto.name);
  }

  @Patch('zones/:id')
  @Roles(UserRole.Admin)
  @ApiForbiddenResponse({
    description: 'Insufficient permissions (Admin role required)',
  })
  @ApiOperation({
    summary: 'Update a zone',
    description: 'Example body: { "name": "Zona Metropolitana" }',
  })
  @ApiOkResponse({ description: 'Zone updated successfully.' })
  @ApiNotFoundResponse({ description: 'Zone not found.' })
  async updateZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogEntryDto,
  ) {
    return this.updateCatalogEntryUseCase.execute('zone', id, dto.name);
  }

  @Patch('zones/:id/status')
  @Roles(UserRole.Admin)
  @ApiForbiddenResponse({
    description: 'Insufficient permissions (Admin role required)',
  })
  @ApiOperation({
    summary: 'Activate or deactivate a zone',
    description: 'Example body: { "active": false }',
  })
  @ApiOkResponse({ description: 'Zone status changed successfully.' })
  @ApiNotFoundResponse({ description: 'Zone not found.' })
  async setZoneStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCatalogEntryStatusDto,
  ) {
    await this.setCatalogEntryStatusUseCase.execute('zone', id, dto.active);

    return {
      message: `Zone ${dto.active ? 'activated' : 'deactivated'} successfully`,
    };
  }

  @Get('client-types')
  @ApiOperation({ summary: 'List client types seeded by the application' })
  @ApiOkResponse({ description: 'Returns client types ordered by name.' })
  async getClientTypes(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('clientType', query, user);
  }

  @Get('potentials')
  @ApiOperation({ summary: 'List client potentials seeded by the application' })
  @ApiOkResponse({
    description: 'Returns client potentials ordered by display priority.',
  })
  async getPotentials(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('clientPotential', query, user);
  }

  @Get('client-statuses')
  @ApiOperation({ summary: 'List client statuses seeded by the application' })
  @ApiOkResponse({ description: 'Returns client statuses ordered by name.' })
  async getClientStatuses(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('clientStatus', query, user);
  }

  @Get('visit-results')
  @ApiOperation({ summary: 'List visit results seeded by the application' })
  @ApiOkResponse({ description: 'Returns visit results ordered by name.' })
  async getVisitResults(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('visitResult', query, user);
  }

  @Get('visit-objectives')
  @ApiOperation({
    summary: 'List visit objectives seeded by the application',
  })
  @ApiOkResponse({ description: 'Returns visit objectives ordered by name.' })
  async getVisitObjectives(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('visitObjective', query, user);
  }

  @Get('visit-types')
  @ApiOperation({ summary: 'List visit types seeded by the application' })
  @ApiOkResponse({ description: 'Returns visit types ordered by name.' })
  async getVisitTypes(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('visitType', query, user);
  }

  @Get('portfolios')
  @ApiOperation({ summary: 'List portfolios seeded by the application' })
  @ApiOkResponse({ description: 'Returns portfolios ordered by name.' })
  async getPortfolios(
    @Query() query: CatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.list('portfolio', query, user);
  }

  private list(type: CatalogType, query: CatalogQueryDto, user: AuthUser) {
    const includeInactive =
      query.includeInactive === true && user.role === UserRole.Admin;

    return this.getCatalogEntriesUseCase.execute(type, includeInactive);
  }
}
