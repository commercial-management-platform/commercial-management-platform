import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { SalesOrder } from '../../domain/entities/sales-order.js';
import type { SalesOrderRepositoryPort } from '../../domain/ports/sales-order.repository.port.js';
import type { SalesOrderActor } from '../types/sales-order-actor.js';

export class GetSalesOrderUseCase {
  constructor(
    private readonly orders: SalesOrderRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(actor: SalesOrderActor, id: number): Promise<SalesOrder> {
    const order = await this.orders.findById(id);
    if (
      !order ||
      (actor.role === UserRole.Advisor &&
        !(await this.advisorAccess.canAccess(actor.id, order.clientId)))
    ) {
      throw new NotFoundError(`Sales order with id '${id}' not found`);
    }
    return order;
  }
}
