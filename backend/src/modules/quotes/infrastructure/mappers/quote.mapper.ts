import { Quote } from '../../domain/entities/quote.js';
import { QuoteOrmEntity } from '../persistence/entities/quote.orm-entity.js';

export class QuoteMapper {
  static toDomain(entity: QuoteOrmEntity): Quote {
    return new Quote({
      id: entity.id,
      number: entity.number,
      clientId: entity.clientId,
      advisorId: entity.advisorId,
      visitId: entity.visitId,
      date: entity.date,
      value: entity.value,
      currency: entity.currency,
      status: entity.status,
      documentKey: entity.documentKey,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(quote: Quote): QuoteOrmEntity {
    const entity = new QuoteOrmEntity();
    if (quote.id !== null) entity.id = quote.id;
    if (quote.number !== null) entity.number = quote.number;
    entity.clientId = quote.clientId;
    entity.advisorId = quote.advisorId;
    entity.visitId = quote.visitId;
    entity.date = quote.date;
    entity.value = quote.value;
    entity.currency = quote.currency;
    entity.status = quote.status;
    entity.documentKey = quote.documentKey;
    return entity;
  }
}
