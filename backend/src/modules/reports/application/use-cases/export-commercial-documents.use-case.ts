import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { QuoteStatus } from '../../../quotes/domain/entities/quote-status.js';
import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';
import type {
  QuoteReportRow,
  SalesOrderReportRow,
} from '../../domain/entities/report-rows.js';
import type {
  CommercialDocumentFilter,
  ReportSourcesPort,
} from '../../domain/ports/report-sources.port.js';
import { assertDateRange } from '../../../../shared/application/business-date-filters.js';
import type { ReportActor } from '../types/report-actor.js';

/** Same filters as GET /quotes and GET /sales-orders. */
export interface ExportCommercialDocumentsInput<S> {
  clientId?: number;
  advisorId?: number;
  status?: S;
  fromDate?: string;
  toDate?: string;
}

/**
 * Validates the filters and applies the visibility of GET /quotes and
 * GET /sales-orders: an advisor only sees the documents of the clients on
 * their routes; admin and director see all of them.
 */
async function toFilter<S>(
  actor: ReportActor,
  input: ExportCommercialDocumentsInput<S>,
  advisorAccess: AdvisorClientAccessPort,
): Promise<CommercialDocumentFilter<S>> {
  assertDateRange(input.fromDate, input.toDate);
  const clientIds =
    actor.role === UserRole.Advisor
      ? await advisorAccess.getAccessibleClientIds(actor.id)
      : undefined;
  return { ...input, clientIds };
}

/** Quotes report (HU-17, optional). */
export class ExportQuotesUseCase {
  constructor(
    private readonly sources: ReportSourcesPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: ReportActor,
    input: ExportCommercialDocumentsInput<QuoteStatus>,
  ): Promise<AsyncIterable<QuoteReportRow>> {
    return this.sources.quotes(
      await toFilter(actor, input, this.advisorAccess),
    );
  }
}

/** Sales orders report (HU-17, optional). */
export class ExportSalesOrdersUseCase {
  constructor(
    private readonly sources: ReportSourcesPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: ReportActor,
    input: ExportCommercialDocumentsInput<SalesOrderStatus>,
  ): Promise<AsyncIterable<SalesOrderReportRow>> {
    return this.sources.salesOrders(
      await toFilter(actor, input, this.advisorAccess),
    );
  }
}
