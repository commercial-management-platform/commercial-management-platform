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
import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';
import { QuoteOrmEntity } from '../../../../quotes/infrastructure/persistence/entities/quote.orm-entity.js';
import { AdvisorOrmEntity } from '../../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';
import { VisitOrmEntity } from '../../../../visits/infrastructure/persistence/entities/visit.orm-entity.js';
import type { SalesOrderStatus } from '../../../domain/entities/sales-order-status.js';

@Entity({ name: 'sales_order' })
@Index('UQ_sales_order_number', ['number'], { unique: true })
@Index('UQ_sales_order_quote_id', ['quoteId'], {
  unique: true,
  where: '"quote_id" IS NOT NULL',
})
@Index('IDX_sales_order_client_id_date', ['clientId', 'date'])
@Index('IDX_sales_order_advisor_id_date', ['advisorId', 'date'])
@Index('IDX_sales_order_status', ['status'])
@Index('IDX_sales_order_visit_id', ['visitId'])
export class SalesOrderOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' }) id: number;
  @Column({ name: 'number', type: 'varchar', length: 20 }) number: string;
  @Column({ name: 'client_id', type: 'integer' }) clientId: number;
  @Column({ name: 'quote_id', type: 'integer', nullable: true }) quoteId:
    number | null;
  @Column({ name: 'visit_id', type: 'integer', nullable: true }) visitId:
    number | null;
  @Column({ name: 'advisor_id', type: 'integer' }) advisorId: number;
  @Column({ name: 'date', type: 'date' }) date: string;
  @Column({ name: 'value', type: 'numeric', precision: 18, scale: 6 })
  value: string;
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status: SalesOrderStatus;
  @Column({ name: 'estimated_delivery_date', type: 'date' })
  estimatedDeliveryDate: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'FK_sales_order_client_id',
  })
  client?: ClientOrmEntity;
  @ManyToOne(() => QuoteOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'quote_id',
    foreignKeyConstraintName: 'FK_sales_order_quote_id',
  })
  quote?: QuoteOrmEntity | null;
  @ManyToOne(() => VisitOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'visit_id',
    foreignKeyConstraintName: 'FK_sales_order_visit_id',
  })
  visit?: VisitOrmEntity | null;
  @ManyToOne(() => AdvisorOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'advisor_id',
    foreignKeyConstraintName: 'FK_sales_order_advisor_id',
  })
  advisor?: AdvisorOrmEntity;
}
