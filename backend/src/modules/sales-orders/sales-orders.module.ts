import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ACTIVITY_LOG,
  type ActivityLogPort,
} from '../../shared/application/ports/activity-log.port.js';
import { ActivityLogWriterModule } from '../activity-log/activity-log-writer.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../clients/application/ports/advisor-client-access.port.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ChangeSalesOrderStatusUseCase } from './application/use-cases/change-sales-order-status.use-case.js';
import { CreateSalesOrderFromQuoteUseCase } from './application/use-cases/create-sales-order-from-quote.use-case.js';
import { CreateSalesOrderUseCase } from './application/use-cases/create-sales-order.use-case.js';
import { GetSalesOrderUseCase } from './application/use-cases/get-sales-order.use-case.js';
import { ListSalesOrdersUseCase } from './application/use-cases/list-sales-orders.use-case.js';
import {
  SALES_ORDER_REFERENCES,
  type SalesOrderReferencesPort,
} from './domain/ports/sales-order-references.port.js';
import {
  SALES_ORDER_REPOSITORY,
  type SalesOrderRepositoryPort,
} from './domain/ports/sales-order.repository.port.js';
import { TypeOrmSalesOrderReferencesAdapter } from './infrastructure/adapters/typeorm-sales-order-references.adapter.js';
import { SalesOrderMapper } from './infrastructure/mappers/sales-order.mapper.js';
import { SalesOrderDao } from './infrastructure/persistence/daos/sales-order.dao.js';
import { SalesOrderReferencesDao } from './infrastructure/persistence/daos/sales-order-references.dao.js';
import { SalesOrderOrmEntity } from './infrastructure/persistence/entities/sales-order.orm-entity.js';
import { SalesOrderRepositoryImpl } from './infrastructure/repositories/sales-order.repository.impl.js';
import { QuoteSalesOrdersController } from './presentation/controllers/quote-sales-orders.controller.js';
import { SalesOrdersController } from './presentation/controllers/sales-orders.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesOrderOrmEntity]),
    AuthModule,
    ClientsModule,
    ActivityLogWriterModule,
  ],
  controllers: [SalesOrdersController, QuoteSalesOrdersController],
  providers: [
    SalesOrderDao,
    SalesOrderReferencesDao,
    SalesOrderMapper,
    { provide: SALES_ORDER_REPOSITORY, useClass: SalesOrderRepositoryImpl },
    {
      provide: SALES_ORDER_REFERENCES,
      useClass: TypeOrmSalesOrderReferencesAdapter,
    },
    {
      provide: CreateSalesOrderUseCase,
      inject: [
        SALES_ORDER_REPOSITORY,
        SALES_ORDER_REFERENCES,
        ADVISOR_CLIENT_ACCESS,
        ACTIVITY_LOG,
      ],
      useFactory: (
        orders: SalesOrderRepositoryPort,
        references: SalesOrderReferencesPort,
        access: AdvisorClientAccessPort,
        activity: ActivityLogPort,
      ) => new CreateSalesOrderUseCase(orders, references, access, activity),
    },
    {
      provide: CreateSalesOrderFromQuoteUseCase,
      inject: [
        SALES_ORDER_REPOSITORY,
        SALES_ORDER_REFERENCES,
        CreateSalesOrderUseCase,
      ],
      useFactory: (
        orders: SalesOrderRepositoryPort,
        references: SalesOrderReferencesPort,
        create: CreateSalesOrderUseCase,
      ) => new CreateSalesOrderFromQuoteUseCase(orders, references, create),
    },
    {
      provide: ListSalesOrdersUseCase,
      inject: [SALES_ORDER_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        orders: SalesOrderRepositoryPort,
        access: AdvisorClientAccessPort,
      ) => new ListSalesOrdersUseCase(orders, access),
    },
    {
      provide: GetSalesOrderUseCase,
      inject: [SALES_ORDER_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        orders: SalesOrderRepositoryPort,
        access: AdvisorClientAccessPort,
      ) => new GetSalesOrderUseCase(orders, access),
    },
    {
      provide: ChangeSalesOrderStatusUseCase,
      inject: [SALES_ORDER_REPOSITORY, ACTIVITY_LOG],
      useFactory: (
        orders: SalesOrderRepositoryPort,
        activity: ActivityLogPort,
      ) => new ChangeSalesOrderStatusUseCase(orders, activity),
    },
  ],
})
export class SalesOrdersModule {}
