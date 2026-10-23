import {
  BadRequestException,
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
  Res,
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { ChangeClientStatusUseCase } from '../application/use-cases/change-client-status.use-case.js';
import { CreateClientUseCase } from '../application/use-cases/create-client.use-case.js';
import { GetClientByIdUseCase } from '../application/use-cases/get-client-by-id.use-case.js';
import { ImportClientsUseCase } from '../application/use-cases/import-clients.use-case.js';
import type { UploadedClientImportFile } from '../application/use-cases/import-clients.use-case.js';
import { ListClientsUseCase } from '../application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from '../application/use-cases/update-client.use-case.js';
import type { ClientActor } from '../application/types/client-actor.js';
import { ChangeClientStatusDto } from './dtos/change-client-status.dto.js';
import { ClientResponseDto } from './dtos/client-response.dto.js';
import { CreateClientDto } from './dtos/create-client.dto.js';
import { ListClientsQueryDto } from './dtos/list-clients-query.dto.js';
import { UpdateClientDto } from './dtos/update-client.dto.js';

function toActor(user: AuthUser): ClientActor {
  return { id: user.id, role: user.role };
}

export class ImportClientsQueryDto {
  @ApiProperty({ required: false, description: 'Validation only mode' })
  dryRun?: boolean;
}

export class ImportClientReportErrorDto {
  @ApiProperty({ example: 3 })
  rowNumber: number;

  @ApiProperty({ example: 'nit' })
  column: string;

  @ApiProperty({ example: 'nit already exists in the database' })
  reason: string;
}

export class ImportClientsResponseDto {
  @ApiProperty({ example: 5 })
  totalRows: number;

  @ApiProperty({ example: 3 })
  importedRows: number;

  @ApiProperty({ example: 2 })
  errorRows: number;

  @ApiProperty({ example: 'imported', enum: ['validated', 'imported', 'failed'] })
  status: 'validated' | 'imported' | 'failed';

  @ApiProperty({ type: [ImportClientReportErrorDto] })
  errors: ImportClientReportErrorDto[];
}

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly createClient: CreateClientUseCase,
    private readonly listClients: ListClientsUseCase,
    private readonly getClientById: GetClientByIdUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly changeClientStatus: ChangeClientStatusUseCase,
    private readonly importClientsUseCase: ImportClientsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Register a new client (admin and director only)' })
  @ApiCreatedResponse({
    type: ClientResponseDto,
    description: 'Client created successfully',
  })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  @ApiConflictResponse({
    description: 'A client with the same NIT already exists',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can create clients',
  })
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientResponseDto> {
    const client = await this.createClient.execute({
      actor: toActor(user),
      ...dto,
    });
    return ClientResponseDto.fromDomain(client);
  }

  @Get()
  @ApiOperation({
    summary:
      'List clients. Admin and director see all; advisors only their routed clients',
  })
  @ApiOkResponse({
    type: [ClientResponseDto],
    description: 'Clients matching the given filters',
  })
  @ApiBadRequestResponse({ description: 'Validation error on query filters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async list(
    @Query() query: ListClientsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientResponseDto[]> {
    const clients = await this.listClients.execute({
      actor: toActor(user),
      ...query,
    });
    return clients.map((client) => ClientResponseDto.fromDomain(client));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a client by id. Advisors only see clients on their routes, otherwise 404',
  })
  @ApiOkResponse({
    type: ClientResponseDto,
    description: 'Client found',
  })
  @ApiNotFoundResponse({ description: 'Client does not exist or not visible' })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientResponseDto> {
    const client = await this.getClientById.execute({
      actor: toActor(user),
      clientId: id,
    });
    return ClientResponseDto.fromDomain(client);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update the allowed client fields. Advisors only update clients on their routes, otherwise 404',
  })
  @ApiOkResponse({
    type: ClientResponseDto,
    description: 'Client updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  @ApiConflictResponse({
    description: 'A client with the same NIT already exists',
  })
  @ApiNotFoundResponse({ description: 'Client does not exist or not visible' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientResponseDto> {
    const client = await this.updateClient.execute({
      actor: toActor(user),
      clientId: id,
      data: dto,
    });
    return ClientResponseDto.fromDomain(client);
  }

  @Patch(':id/status')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary:
      'Activate or deactivate a client (admin and director only). Never deletes the client',
  })
  @ApiOkResponse({
    type: ClientResponseDto,
    description: 'Client status updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  @ApiNotFoundResponse({ description: 'Client does not exist' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can change the client status',
  })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeClientStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientResponseDto> {
    const client = await this.changeClientStatus.execute({
      actor: toActor(user),
      clientId: id,
      active: dto.active,
    });
    return ClientResponseDto.fromDomain(client);
  }

  @Get('import/template')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({ summary: 'Download the CSV template for client import' })
  @ApiOkResponse({ description: 'CSV template downloaded successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can import clients',
  })
  async downloadImportTemplate(@Res() res: Response): Promise<void> {
    const csv = [
      'nit,business_name,trade_name,address,department,municipality,neighborhood,phone,email,latitude,longitude,zone,client_type,client_potential,client_status,visit_frequency_days',
      '900123456-5,Distribuidora Andina,Andina,Calle 80 #45-12,Bogotá,Bogotá,Centro,6015551234,ventas@andina.com,4.60971,-74.08175,Centro,Mayorista,Alto,Activo,30',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="clientes-import-template.csv"',
    );
    res.send(csv);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Validate or import clients from a CSV file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        dryRun: { type: 'boolean', example: true },
      },
    },
  })
  @ApiOkResponse({
    type: ImportClientsResponseDto,
    description: 'CSV validation or import report',
  })
  @ApiBadRequestResponse({ description: 'File missing, malformed or invalid rows' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can import clients',
  })
  async importClients(
    @UploadedFile() file: UploadedClientImportFile,
    @CurrentUser() user: AuthUser,
    @Query() query: ImportClientsQueryDto,
  ): Promise<ImportClientsResponseDto> {
    const report = await this.importClientsUseCase.execute({
      userId: user.id,
      file,
      dryRun: query.dryRun === true,
    });

    if (report.status === 'failed') {
      throw new BadRequestException(report);
    }

    return report;
  }
}
