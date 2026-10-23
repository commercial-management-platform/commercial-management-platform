import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import type { SalesOrderStatus } from '../../domain/entities/sales-order-status.js';
import type { SalesOrder } from '../../domain/entities/sales-order.js';
import type { SalesOrderRepositoryPort } from '../../domain/ports/sales-order.repository.port.js';
import type { SalesOrderActor } from '../types/sales-order-actor.js';

export class ChangeSalesOrderStatusUseCase {
  constructor(
    private readonly orders: SalesOrderRepositoryPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(
    actor: SalesOrderActor,
    id: number,
    status: SalesOrderStatus,
  ): Promise<SalesOrder> {
    const order = await this.orders.findById(id);
    if (!order)
      throw new NotFoundError(`Sales order with id '${id}' not found`);
    const expected = order.status;
    order.changeStatus(status);
    const updated = await this.orders.updateStatusIfCurrent(
      id,
      order.status,
      expected,
    );
    if (!updated)
      throw new NotFoundError(
        `Sales order with id '${id}' was changed concurrently`,
      );
    await this.activityLog.record({
      action: 'sales_order.status_changed',
      userId: actor.id,
      clientId: updated.clientId,
      description: `Sales order '${updated.number}' status changed from '${expected}' to '${updated.status}'`,
      occurredAt: new Date(),
    });
    return updated;
  }
}
