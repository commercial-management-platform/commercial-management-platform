import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { calculateTotal } from './quote-decimal.js';
import type { QuoteDetail } from './quote-detail.js';
import {
  assertQuoteDetailsEditable,
  QUOTE_STATUS_RULES,
  type QuoteStatus,
} from './quote-status.js';

export interface QuoteProps {
  id: number | null;
  number: string | null;
  clientId: number;
  advisorId: number;
  visitId: number | null;
  /** ISO date (YYYY-MM-DD), independent of a time zone. */
  date: string;
  /** Decimal text. HU-13 updates it from quote details; it is never client input. */
  value: string;
  currency: string;
  status: QuoteStatus;
  documentKey: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Quote {
  readonly id: number | null;
  readonly number: string | null;
  readonly clientId: number;
  readonly advisorId: number;
  readonly visitId: number | null;
  readonly date: string;
  value: string;
  readonly currency: string;
  status: QuoteStatus;
  documentKey: string | null;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: QuoteProps) {
    this.id = props.id;
    this.number = props.number;
    this.clientId = props.clientId;
    this.advisorId = props.advisorId;
    this.visitId = props.visitId;
    this.date = props.date;
    this.value = props.value;
    this.currency = props.currency;
    this.status = props.status;
    this.documentKey = props.documentKey;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(input: {
    clientId: number;
    advisorId: number;
    visitId: number | null;
    date: string;
    currency: string;
  }): Quote {
    return new Quote({
      id: null,
      number: null,
      ...input,
      value: '0.00',
      status: 'draft',
      documentKey: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  changeStatus(nextStatus: QuoteStatus): void {
    if (!QUOTE_STATUS_RULES[this.status].allowedNext.includes(nextStatus)) {
      throw new ValidationError(
        `Cannot change a quote from '${this.status}' to '${nextStatus}'`,
      );
    }
    this.status = nextStatus;
  }

  assertDetailsEditable(): void {
    assertQuoteDetailsEditable(this.status);
  }

  recalculateValue(details: readonly QuoteDetail[]): void {
    this.value = calculateTotal(details.map((detail) => detail.subtotal));
  }
}
