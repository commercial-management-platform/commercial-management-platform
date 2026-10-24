import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import {
  UTF8_BOM,
  toCsvLine,
} from '../../../shared/infrastructure/csv/csv-writer.js';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { GetClientImportTemplateUseCase } from '../application/use-cases/get-client-import-template.use-case.js';
import {
  IMPORT_MAX_BYTES,
  ImportClientsUseCase,
} from '../application/use-cases/import-clients.use-case.js';
import type { ClientImportFile } from '../domain/ports/client-import-storage.port.js';
import {
  CLIENT_IMPORT_REPOSITORY,
  type ClientImportRepository,
} from '../domain/ports/client-import.repository.js';
import {
  ClientImportRecordDto,
  ClientImportReportDto,
  ImportClientsQueryDto,
} from './dtos/client-import.dto.js';

/**
 * Bulk import of clients from CSV (HU-22). Only admin and director (CA-02).
 * Registered before ClientsController so `GET /clients/:id` does not capture
 * `/clients/import/template` or `/clients/imports`.
 */
@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Director)
@ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
@ApiForbiddenResponse({ description: 'Only admin and director can import clients' })
@Controller('clients')
export class ClientImportController {
  constructor(
    private readonly getTemplate: GetClientImportTemplateUseCase,
    private readonly importClients: ImportClientsUseCase,
    @Inject(CLIENT_IMPORT_REPOSITORY)
    private readonly imports: ClientImportRepository,
  ) {}

  @Get('import/template')
  @ApiOperation({ summary: 'Download the CSV template of the client import (CA-01)' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description:
      'UTF-8 with BOM, semicolon separator: the expected headers and one example row',
  })
  async template(@Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
    const lines = await this.getTemplate.execute();
    response.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(
      Buffer.from(UTF8_BOM + lines.map((line) => toCsvLine(line)).join(''), 'utf8'),
      {
        type: 'text/csv; charset=utf-8',
        disposition: 'attachment; filename="plantilla-clientes.csv"',
      },
    );
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  @ApiOperation({
    summary: 'Validate (dryRun=true) or import clients from a CSV file',
    description:
      'All or nothing: with a single invalid row no client is imported and the answer is 400 with the same report.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: ClientImportReportDto, description: 'validated or imported' })
  @ApiBadRequestResponse({
    type: ClientImportReportDto,
    description: 'Missing file, more than 5000 rows, or rows with errors (status failed)',
  })
  @ApiPayloadTooLargeResponse({ description: 'File larger than 2 MB' })
  async import(
    @UploadedFile() file: ClientImportFile | undefined,
    @Query() query: ImportClientsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientImportReportDto> {
    const report = await this.importClients.execute({
      userId: user.id,
      file,
      dryRun: query.dryRun === true,
    });
    if (report.status === 'failed') throw new BadRequestException(report);
    return report;
  }

  @Get('imports')
  @ApiOperation({ summary: 'History of client imports, newest first' })
  @ApiOkResponse({ type: [ClientImportRecordDto] })
  async history(): Promise<ClientImportRecordDto[]> {
    const records = await this.imports.findAll();
    return records.map((record) => ClientImportRecordDto.fromDomain(record));
  }
}
