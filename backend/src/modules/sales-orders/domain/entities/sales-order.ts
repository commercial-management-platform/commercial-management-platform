import {
  assertSalesOrderTransition,
  type SalesOrderStatus,
} from './sales-order-status.js';

export interface SalesOrderProps {
  id: number | null;
  number: string | null;
  clientId: number;
  quoteId: number | null;
  visitId: number | null;
  advisorId: number;
  date: string;
  value: string;
  status: SalesOrderStatus;
  estimatedDeliveryDate: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class SalesOrder {
  readonly id: number | null;
  readonly number: string | null;
  readonly clientId: number;
  readonly quoteId: number | null;
  readonly visitId: number | null;
  readonly advisorId: number;
  readonly date: string;
  readonly value: string;
  status: SalesOrderStatus;
  readonly estimatedDeliveryDate: string;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: SalesOrderProps) {
    Object.assign(this, props);
  }

  static create(
    input: Omit<
      SalesOrderProps,
      'id' | 'number' | 'status' | 'createdAt' | 'updatedAt'
    >,
  ): SalesOrder {
    return new SalesOrder({
      id: null,
      number: null,
      ...input,
      status: 'pending',
      createdAt: null,
      updatedAt: null,
    });
  }

  changeStatus(nextStatus: SalesOrderStatus): void {
    assertSalesOrderTransition(this.status, nextStatus);
    this.status = nextStatus;
  }
}
