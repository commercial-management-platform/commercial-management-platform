import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/errors/index.js';
import type { SalesOrderRepositoryPort } from '../../domain/ports/sales-order.repository.port.js';
import type { SalesOrderReferencesPort } from '../../domain/ports/sales-order-references.port.js';
import { SalesOrder } from '../../domain/entities/sales-order.js';
import {
  assertDeliveryNotBeforeOrder,
  assertOrderDate,
} from '../sales-order-validation.js';
import type { SalesOrderActor } from '../types/sales-order-actor.js';
import { CreateSalesOrderUseCase } from './create-sales-order.use-case.js';

export interface CreateSalesOrderFromQuoteInput {
  actor: SalesOrderActor;
  quoteId: number;
  visitId?: number | null;
  date: string;
  estimatedDeliveryDate: string;
}

export class CreateSalesOrderFromQuoteUseCase {
  constructor(
    private readonly orders: SalesOrderRepositoryPort,
    private readonly references: SalesOrderReferencesPort,
    private readonly createOrder: CreateSalesOrderUseCase,
  ) {}

  async execute(input: CreateSalesOrderFromQuoteInput): Promise<SalesOrder> {
    assertOrderDate(input.date, 'date');
    assertOrderDate(input.estimatedDeliveryDate, 'estimatedDeliveryDate');
    assertDeliveryNotBeforeOrder(input.date, input.estimatedDeliveryDate);
    const quote = await this.references.findQuote(input.quoteId);
    if (!quote)
      throw new NotFoundError(`Quote with id '${input.quoteId}' not found`);
    await this.createOrder.assertClientVisible(input.actor, quote.clientId);
    await this.createOrder.assertVisit(
      input.visitId ?? null,
      quote.clientId,
      quote.advisorId,
    );
    if (await this.orders.findByQuoteId(input.quoteId))
      throw new ConflictError(
        `Quote with id '${input.quoteId}' already has a sales order`,
      );
    return this.createOrder.save(
      input.actor,
      SalesOrder.create({
        clientId: quote.clientId,
        advisorId: quote.advisorId,
        visitId: input.visitId ?? null,
        quoteId: quote.id,
        date: input.date,
        value: quote.value,
        estimatedDeliveryDate: input.estimatedDeliveryDate,
      }),
    );
  }
}
