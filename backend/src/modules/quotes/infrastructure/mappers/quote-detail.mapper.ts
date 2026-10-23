import { QuoteDetail } from '../../domain/entities/quote-detail.js';
import { QuoteDetailOrmEntity } from '../persistence/entities/quote-detail.orm-entity.js';

export class QuoteDetailMapper {
  static toDomain(entity: QuoteDetailOrmEntity): QuoteDetail {
    return new QuoteDetail({
      id: entity.id,
      quoteId: entity.quoteId,
      product: entity.product,
      quantity: entity.quantity,
      price: entity.price,
      subtotal: entity.subtotal,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(detail: QuoteDetail): QuoteDetailOrmEntity {
    const entity = new QuoteDetailOrmEntity();
    if (detail.id !== null) entity.id = detail.id;
    entity.quoteId = detail.quoteId;
    entity.product = detail.product;
    entity.quantity = detail.quantity;
    entity.price = detail.price;
    entity.subtotal = detail.subtotal;
    return entity;
  }
}
