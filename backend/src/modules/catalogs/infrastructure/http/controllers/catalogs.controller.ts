import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateCatalogEntryUseCase } from '../../../application/use-cases/create-catalog-entry.use-case.js';
import { GetCatalogEntriesUseCase } from '../../../application/use-cases/get-catalog-entries.use-case.js';
import { SetCatalogEntryStatusUseCase } from '../../../application/use-cases/set-catalog-entry-status.use-case.js';
import { UpdateCatalogEntryUseCase } from '../../../application/use-cases/update-catalog-entry.use-case.js';
import { CreateCatalogEntryDto } from '../dtos/create-catalog-entry.dto.js';
import { SetCatalogEntryStatusDto } from '../dtos/set-catalog-entry-status.dto.js';
import { UpdateCatalogEntryDto } from '../dtos/update-catalog-entry.dto.js';

@ApiTags('Catalogs')
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
  async getZones() {
    return this.getCatalogEntriesUseCase.execute('zone');
  }

  @Post('zones')
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
  async getClientTypes() {
    return this.getCatalogEntriesUseCase.execute('clientType');
  }

  @Get('potentials')
  @ApiOperation({ summary: 'List client potentials seeded by the application' })
  @ApiOkResponse({
    description: 'Returns client potentials ordered by display priority.',
  })
  async getPotentials() {
    return this.getCatalogEntriesUseCase.execute('clientPotential');
  }

  @Get('client-statuses')
  @ApiOperation({ summary: 'List client statuses seeded by the application' })
  @ApiOkResponse({ description: 'Returns client statuses ordered by name.' })
  async getClientStatuses() {
    return this.getCatalogEntriesUseCase.execute('clientStatus');
  }

  @Get('visit-results')
  @ApiOperation({ summary: 'List visit results seeded by the application' })
  @ApiOkResponse({ description: 'Returns visit results ordered by name.' })
  async getVisitResults() {
    return this.getCatalogEntriesUseCase.execute('visitResult');
  }

  @Get('visit-objectives')
  @ApiOperation({
    summary: 'List visit objectives seeded by the application',
  })
  @ApiOkResponse({ description: 'Returns visit objectives ordered by name.' })
  async getVisitObjectives() {
    return this.getCatalogEntriesUseCase.execute('visitObjective');
  }

  @Get('visit-types')
  @ApiOperation({ summary: 'List visit types seeded by the application' })
  @ApiOkResponse({ description: 'Returns visit types ordered by name.' })
  async getVisitTypes() {
    return this.getCatalogEntriesUseCase.execute('visitType');
  }
}
