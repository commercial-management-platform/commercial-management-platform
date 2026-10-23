import { SalesOrder } from '../../domain/entities/sales-order.js';
import { SalesOrderOrmEntity } from '../persistence/entities/sales-order.orm-entity.js';

export class SalesOrderMapper {
  static toDomain(entity: SalesOrderOrmEntity): SalesOrder {
    return new SalesOrder({
      id: entity.id,
      number: entity.number,
      clientId: entity.clientId,
      quoteId: entity.quoteId,
      visitId: entity.visitId,
      advisorId: entity.advisorId,
      date: entity.date,
      value: entity.value,
      status: entity.status,
      estimatedDeliveryDate: entity.estimatedDeliveryDate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(order: SalesOrder): SalesOrderOrmEntity {
    const entity = new SalesOrderOrmEntity();
    if (order.id !== null) entity.id = order.id;
    if (order.number !== null) entity.number = order.number;
    entity.clientId = order.clientId;
    entity.quoteId = order.quoteId;
    entity.visitId = order.visitId;
    entity.advisorId = order.advisorId;
    entity.date = order.date;
    entity.value = order.value;
    entity.status = order.status;
    entity.estimatedDeliveryDate = order.estimatedDeliveryDate;
    return entity;
  }
}
