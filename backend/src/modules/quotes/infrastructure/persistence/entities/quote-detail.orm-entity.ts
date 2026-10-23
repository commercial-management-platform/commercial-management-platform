import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { QuoteOrmEntity } from './quote.orm-entity.js';

@Entity({ name: 'quote_detail' })
@Index('IDX_quote_detail_quote_id', ['quoteId'])
export class QuoteDetailOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'quote_id', type: 'integer' })
  quoteId: number;

  @Column({ name: 'product', type: 'varchar', length: 255 })
  product: string;

  @Column({ name: 'quantity', type: 'numeric', precision: 14, scale: 3 })
  quantity: string;

  @Column({ name: 'price', type: 'numeric', precision: 14, scale: 3 })
  price: string;

  @Column({ name: 'subtotal', type: 'numeric', precision: 18, scale: 6 })
  subtotal: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => QuoteOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'quote_id',
    foreignKeyConstraintName: 'FK_quote_detail_quote_id',
  })
  quote?: QuoteOrmEntity;
}
