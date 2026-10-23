import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { calculateSubtotal } from './quote-decimal.js';

export interface QuoteDetailProps {
  id: number | null;
  quoteId: number;
  product: string;
  quantity: string;
  price: string;
  subtotal: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class QuoteDetail {
  readonly id: number | null;
  readonly quoteId: number;
  readonly product: string;
  quantity: string;
  price: string;
  subtotal: string;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: QuoteDetailProps) {
    this.id = props.id;
    this.quoteId = props.quoteId;
    this.product = props.product;
    this.quantity = props.quantity;
    this.price = props.price;
    this.subtotal = props.subtotal;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(input: {
    quoteId: number;
    product: string;
    quantity: string;
    price: string;
  }): QuoteDetail {
    const product = input.product.trim();
    if (!product) throw new ValidationError('product is required');
    return new QuoteDetail({
      id: null,
      quoteId: input.quoteId,
      product,
      quantity: input.quantity,
      price: input.price,
      subtotal: calculateSubtotal(input.quantity, input.price),
      createdAt: null,
      updatedAt: null,
    });
  }

  update(input: { quantity?: string; price?: string }): void {
    if (input.quantity === undefined && input.price === undefined) {
      throw new ValidationError('quantity or price is required');
    }
    this.quantity = input.quantity ?? this.quantity;
    this.price = input.price ?? this.price;
    this.subtotal = calculateSubtotal(this.quantity, this.price);
  }
}
