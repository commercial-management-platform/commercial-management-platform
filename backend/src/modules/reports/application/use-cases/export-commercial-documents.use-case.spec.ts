import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ReportSourcesPort } from '../../domain/ports/report-sources.port.js';
import {
  ExportQuotesUseCase,
  ExportSalesOrdersUseCase,
} from './export-commercial-documents.use-case.js';

const admin = { id: 'usr-admin', role: UserRole.Admin };
const advisor = { id: 'usr-advisor', role: UserRole.Advisor };

function setup() {
  const sources = {
    visitTracking: vi.fn(),
    quotes: vi.fn().mockReturnValue('quote-rows'),
    salesOrders: vi.fn().mockReturnValue('order-rows'),
  };
  const getAccessibleClientIds = vi.fn().mockResolvedValue([10, 11]);
  const advisorAccess: AdvisorClientAccessPort = {
    canAccess: vi.fn(),
    getAccessibleClientIds,
  };
  const ports = sources as unknown as ReportSourcesPort;
  return {
    sources,
    getAccessibleClientIds,
    quotes: new ExportQuotesUseCase(ports, advisorAccess),
    orders: new ExportSalesOrdersUseCase(ports, advisorAccess),
  };
}

describe('ExportQuotesUseCase and ExportSalesOrdersUseCase', () => {
  it('lets admin export every document with the filters of the list', async () => {
    const { quotes, sources, getAccessibleClientIds } = setup();

    const rows = await quotes.execute(admin, {
      clientId: 10,
      advisorId: 2,
      status: 'sent',
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
    });

    expect(rows).toBe('quote-rows');
    expect(getAccessibleClientIds).not.toHaveBeenCalled();
    expect(sources.quotes).toHaveBeenCalledWith({
      clientId: 10,
      advisorId: 2,
      status: 'sent',
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
      clientIds: undefined,
    });
  });

  it('limits an advisor to the clients on their routes (CA-03)', async () => {
    const { orders, sources, getAccessibleClientIds } = setup();

    await orders.execute(advisor, { status: 'pending' });

    expect(getAccessibleClientIds).toHaveBeenCalledWith('usr-advisor');
    expect(sources.salesOrders).toHaveBeenCalledWith({
      status: 'pending',
      clientIds: [10, 11],
    });
  });

  it.each([
    ['fromDate after toDate', { fromDate: '2026-10-31', toDate: '2026-10-01' }],
    ['an impossible date', { fromDate: '2026-02-30' }],
  ])('rejects %s before reading any row', async (_, input) => {
    const { quotes, orders, sources } = setup();

    await expect(quotes.execute(admin, input)).rejects.toThrow(ValidationError);
    await expect(orders.execute(admin, input)).rejects.toThrow(ValidationError);
    expect(sources.quotes).not.toHaveBeenCalled();
    expect(sources.salesOrders).not.toHaveBeenCalled();
  });
});
