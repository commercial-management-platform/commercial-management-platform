import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import { SalesOrder } from '../../domain/entities/sales-order.js';
import type { SalesOrderReferencesPort } from '../../domain/ports/sales-order-references.port.js';
import type { SalesOrderRepositoryPort } from '../../domain/ports/sales-order.repository.port.js';
import {
  assertOrderDate,
  assertOrderValue,
} from '../sales-order-validation.js';
import type { SalesOrderActor } from '../types/sales-order-actor.js';

export interface CreateSalesOrderInput {
  actor: SalesOrderActor;
  clientId: number;
  advisorId?: number;
  visitId?: number | null;
  date: string;
  value: string;
  estimatedDeliveryDate: string;
}

export class CreateSalesOrderUseCase {
  constructor(
    private readonly orders: SalesOrderRepositoryPort,
    private readonly references: SalesOrderReferencesPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: CreateSalesOrderInput): Promise<SalesOrder> {
    assertOrderDate(input.date, 'date');
    assertOrderDate(input.estimatedDeliveryDate, 'estimatedDeliveryDate');
    assertOrderValue(input.value);
    const advisorId = await this.resolveAdvisorId(input);
    await this.assertClientVisible(input.actor, input.clientId);
    const visitId = input.visitId ?? null;
    await this.assertVisit(visitId, input.clientId, advisorId);
    return this.save(
      input.actor,
      SalesOrder.create({
        clientId: input.clientId,
        advisorId,
        visitId,
        quoteId: null,
        date: input.date,
        value: input.value,
        estimatedDeliveryDate: input.estimatedDeliveryDate,
      }),
    );
  }

  async resolveAdvisorId(input: CreateSalesOrderInput): Promise<number> {
    if (input.actor.role === UserRole.Advisor) {
      const advisor = await this.references.findAdvisorByUserId(input.actor.id);
      if (!advisor || !advisor.active)
        throw new ForbiddenError(
          'The session user has no active advisor profile',
        );
      if (input.advisorId !== undefined && input.advisorId !== advisor.id)
        throw new ForbiddenError(
          'An advisor can only create their own sales orders',
        );
      return advisor.id;
    }
    if (input.advisorId === undefined)
      throw new ValidationError('advisorId is required for admin and director');
    const advisor = await this.references.findAdvisor(input.advisorId);
    if (!advisor || !advisor.active)
      throw new NotFoundError(`Advisor with id '${input.advisorId}' not found`);
    return advisor.id;
  }

  async assertClientVisible(
    actor: SalesOrderActor,
    clientId: number,
  ): Promise<void> {
    const client = await this.references.findClient(clientId);
    if (!client || !client.active)
      throw new NotFoundError(`Client with id '${clientId}' not found`);
    if (
      actor.role === UserRole.Advisor &&
      !(await this.advisorAccess.canAccess(actor.id, clientId))
    ) {
      throw new NotFoundError(`Client with id '${clientId}' not found`);
    }
  }

  async assertVisit(
    visitId: number | null,
    clientId: number,
    advisorId: number,
  ): Promise<void> {
    if (visitId === null) return;
    const visit = await this.references.findVisit(visitId);
    if (!visit) throw new NotFoundError(`Visit with id '${visitId}' not found`);
    if (visit.clientId !== clientId || visit.advisorId !== advisorId) {
      throw new ValidationError(
        'visitId must reference a visit of the same client and advisor',
      );
    }
  }

  async save(actor: SalesOrderActor, order: SalesOrder): Promise<SalesOrder> {
    const saved = await this.orders.create(order);
    await this.activityLog.record({
      action: 'sales_order.created',
      userId: actor.id,
      clientId: saved.clientId,
      description: `Sales order '${saved.number}' created`,
      occurredAt: new Date(),
    });
    return saved;
  }
}
