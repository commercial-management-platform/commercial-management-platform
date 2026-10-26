import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type {
  PageRequest,
  Paginated,
} from '../../../../shared/application/pagination.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { SalesOrderStatus } from '../../domain/entities/sales-order-status.js';
import type { SalesOrder } from '../../domain/entities/sales-order.js';
import type { SalesOrderRepositoryPort } from '../../domain/ports/sales-order.repository.port.js';
import type { SalesOrderActor } from '../types/sales-order-actor.js';

export interface ListSalesOrdersInput {
  clientId?: number;
  advisorId?: number;
  status?: SalesOrderStatus;
  fromDate?: string;
  toDate?: string;
}

export class ListSalesOrdersUseCase {
  constructor(
    private readonly orders: SalesOrderRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: SalesOrderActor,
    filter: ListSalesOrdersInput,
    page: PageRequest,
  ): Promise<Paginated<SalesOrder>> {
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate)
      throw new ValidationError('fromDate cannot be after toDate');
    const clientIds =
      actor.role === UserRole.Advisor
        ? await this.advisorAccess.getAccessibleClientIds(actor.id)
        : undefined;
    const result = await this.orders.findPage({ ...filter, clientIds }, page);
    return { data: result.items, total: result.total, ...page };
  }
}
