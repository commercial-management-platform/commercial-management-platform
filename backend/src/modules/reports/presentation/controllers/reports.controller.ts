import {
  applyDecorators,
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthUser } from '../../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard.js';
import {
  ExportQuotesUseCase,
  ExportSalesOrdersUseCase,
} from '../../application/use-cases/export-commercial-documents.use-case.js';
import { ExportVisitTrackingUseCase } from '../../application/use-cases/export-visit-tracking.use-case.js';
import type { ReportActor } from '../../application/types/report-actor.js';
import { csvFile } from '../csv/csv-file.js';
import {
  QUOTE_COLUMNS,
  SALES_ORDER_COLUMNS,
  VISIT_TRACKING_COLUMNS,
} from '../csv/report-columns.js';
import {
  ExportQuotesQueryDto,
  ExportSalesOrdersQueryDto,
  ExportVisitTrackingQueryDto,
} from '../dtos/export-report-query.dto.js';

function toActor(user: AuthUser): ReportActor {
  return { id: user.id, role: user.role };
}

/** Swagger of a CSV download: format, file name and the shared errors. */
function ApiCsvExport(fileExample: string, headers: string) {
  return applyDecorators(
    ApiProduces('text/csv'),
    ApiOkResponse({
      description: `CSV file, UTF-8 with BOM, semicolon separator (Excel in Spanish), RFC 4180 quoting, streamed. Content-Disposition: attachment; filename="${fileExample}". Header line: ${headers}`,
      content: {
        'text/csv': { schema: { type: 'string', format: 'binary' } },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Invalid filter: malformed or impossible date, fromDate after toDate, unknown status or non-numeric id',
    }),
    ApiUnauthorizedResponse({
      description:
        'Missing, invalid or expired betterAuth session (Authorization: Bearer <token>)',
    }),
    ApiForbiddenResponse({ description: 'The role of the user is not allowed' }),
  );
}

/**
 * CSV exports (HU-17). Read-only. Each request validates its filters and
 * permissions first, then streams the file.
 */
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin, UserRole.Director, UserRole.Advisor)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly exportVisitTracking: ExportVisitTrackingUseCase,
    private readonly exportQuotes: ExportQuotesUseCase,
    private readonly exportSalesOrders: ExportSalesOrdersUseCase,
  ) {}

  @Get('visit-tracking/export')
  @ApiOperation({
    summary: 'Export the route and visit tracking table as CSV',
    description:
      'Same columns and filters as the dashboard table "Seguimiento de rutas y visitas", newest visit first. Filter by week or by fromDate/toDate (business time America/Bogota), zone, advisor and status. Admin and director export every visit; an advisor only their own (advisorId is ignored).',
  })
  @ApiCsvExport(
    'seguimiento-visitas-2026-10-26.csv',
    VISIT_TRACKING_COLUMNS.map((c) => c.header).join(', '),
  )
  async visitTracking(
    @Query() query: ExportVisitTrackingQueryDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const rows = await this.exportVisitTracking.execute(toActor(user), query);
    return csvFile(response, 'seguimiento-visitas', VISIT_TRACKING_COLUMNS, rows);
  }

  @Get('quotes/export')
  @ApiOperation({
    summary: 'Export quotes as CSV',
    description:
      'Same filters as GET /quotes, without pagination, newest first. An advisor only exports the quotes of the clients on their routes.',
  })
  @ApiCsvExport(
    'cotizaciones-2026-10-26.csv',
    QUOTE_COLUMNS.map((c) => c.header).join(', '),
  )
  async quotes(
    @Query() query: ExportQuotesQueryDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const rows = await this.exportQuotes.execute(toActor(user), query);
    return csvFile(response, 'cotizaciones', QUOTE_COLUMNS, rows);
  }

  @Get('sales-orders/export')
  @ApiOperation({
    summary: 'Export sales orders as CSV',
    description:
      'Same filters as GET /sales-orders, without pagination, newest first. An advisor only exports the orders of the clients on their routes.',
  })
  @ApiCsvExport(
    'pedidos-2026-10-26.csv',
    SALES_ORDER_COLUMNS.map((c) => c.header).join(', '),
  )
  async salesOrders(
    @Query() query: ExportSalesOrdersQueryDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const rows = await this.exportSalesOrders.execute(toActor(user), query);
    return csvFile(response, 'pedidos', SALES_ORDER_COLUMNS, rows);
  }
}
