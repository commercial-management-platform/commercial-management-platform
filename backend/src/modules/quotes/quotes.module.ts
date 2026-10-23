import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLogWriterModule } from '../activity-log/activity-log-writer.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../clients/application/ports/advisor-client-access.port.js';
import { ClientsModule } from '../clients/clients.module.js';
import {
  ACTIVITY_LOG,
  type ActivityLogPort,
} from '../../shared/application/ports/activity-log.port.js';
import { ChangeQuoteStatusUseCase } from './application/use-cases/change-quote-status.use-case.js';
import { AddQuoteDetailUseCase } from './application/use-cases/add-quote-detail.use-case.js';
import { CreateQuoteUseCase } from './application/use-cases/create-quote.use-case.js';
import { GetQuoteUseCase } from './application/use-cases/get-quote.use-case.js';
import { ListQuotesUseCase } from './application/use-cases/list-quotes.use-case.js';
import { ListQuoteDetailsUseCase } from './application/use-cases/list-quote-details.use-case.js';
import { RemoveQuoteDetailUseCase } from './application/use-cases/remove-quote-detail.use-case.js';
import { UpdateQuoteDetailUseCase } from './application/use-cases/update-quote-detail.use-case.js';
import {
  QUOTE_REFERENCES,
  type QuoteReferencesPort,
} from './domain/ports/quote-references.port.js';
import {
  QUOTE_REPOSITORY,
  type QuoteRepositoryPort,
} from './domain/ports/quote.repository.port.js';
import {
  QUOTE_DETAIL_REPOSITORY,
  type QuoteDetailRepositoryPort,
} from './domain/ports/quote-detail.repository.port.js';
import { TypeOrmQuoteReferencesAdapter } from './infrastructure/adapters/typeorm-quote-references.adapter.js';
import { QuoteMapper } from './infrastructure/mappers/quote.mapper.js';
import { QuoteDetailMapper } from './infrastructure/mappers/quote-detail.mapper.js';
import { QuoteDao } from './infrastructure/persistence/daos/quote.dao.js';
import { QuoteDetailDao } from './infrastructure/persistence/daos/quote-detail.dao.js';
import { QuoteReferencesDao } from './infrastructure/persistence/daos/quote-references.dao.js';
import { QuoteOrmEntity } from './infrastructure/persistence/entities/quote.orm-entity.js';
import { QuoteDetailOrmEntity } from './infrastructure/persistence/entities/quote-detail.orm-entity.js';
import { QuoteDetailRepositoryImpl } from './infrastructure/repositories/quote-detail.repository.impl.js';
import { QuoteRepositoryImpl } from './infrastructure/repositories/quote.repository.impl.js';
import { QuotesController } from './presentation/controllers/quotes.controller.js';

/** Composition root for HU-12. HU-20 will own document upload and signed URLs. */
@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteOrmEntity, QuoteDetailOrmEntity]),
    AuthModule,
    ClientsModule,
    ActivityLogWriterModule,
  ],
  controllers: [QuotesController],
  providers: [
    QuoteDao,
    QuoteDetailDao,
    QuoteReferencesDao,
    QuoteMapper,
    QuoteDetailMapper,
    { provide: QUOTE_REPOSITORY, useClass: QuoteRepositoryImpl },
    { provide: QUOTE_DETAIL_REPOSITORY, useClass: QuoteDetailRepositoryImpl },
    { provide: QUOTE_REFERENCES, useClass: TypeOrmQuoteReferencesAdapter },
    {
      provide: CreateQuoteUseCase,
      inject: [
        QUOTE_REPOSITORY,
        QUOTE_REFERENCES,
        ADVISOR_CLIENT_ACCESS,
        ACTIVITY_LOG,
      ],
      useFactory: (
        quotes: QuoteRepositoryPort,
        references: QuoteReferencesPort,
        advisorAccess: AdvisorClientAccessPort,
        activityLog: ActivityLogPort,
      ) =>
        new CreateQuoteUseCase(quotes, references, advisorAccess, activityLog),
    },
    {
      provide: ListQuotesUseCase,
      inject: [QUOTE_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        quotes: QuoteRepositoryPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new ListQuotesUseCase(quotes, advisorAccess),
    },
    {
      provide: GetQuoteUseCase,
      inject: [QUOTE_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        quotes: QuoteRepositoryPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new GetQuoteUseCase(quotes, advisorAccess),
    },
    {
      provide: ChangeQuoteStatusUseCase,
      inject: [QUOTE_REPOSITORY, ACTIVITY_LOG],
      useFactory: (quotes: QuoteRepositoryPort, activityLog: ActivityLogPort) =>
        new ChangeQuoteStatusUseCase(quotes, activityLog),
    },
    {
      provide: ListQuoteDetailsUseCase,
      inject: [
        QUOTE_REPOSITORY,
        QUOTE_DETAIL_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
      ],
      useFactory: (
        quotes: QuoteRepositoryPort,
        details: QuoteDetailRepositoryPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new ListQuoteDetailsUseCase(quotes, details, advisorAccess),
    },
    {
      provide: AddQuoteDetailUseCase,
      inject: [
        QUOTE_REPOSITORY,
        QUOTE_DETAIL_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
      ],
      useFactory: (
        quotes: QuoteRepositoryPort,
        details: QuoteDetailRepositoryPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new AddQuoteDetailUseCase(quotes, details, advisorAccess),
    },
    {
      provide: UpdateQuoteDetailUseCase,
      inject: [
        QUOTE_REPOSITORY,
        QUOTE_DETAIL_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
      ],
      useFactory: (
        quotes: QuoteRepositoryPort,
        details: QuoteDetailRepositoryPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new UpdateQuoteDetailUseCase(quotes, details, advisorAccess),
    },
    {
      provide: RemoveQuoteDetailUseCase,
      inject: [
        QUOTE_REPOSITORY,
        QUOTE_DETAIL_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
      ],
      useFactory: (
        quotes: QuoteRepositoryPort,
        details: QuoteDetailRepositoryPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new RemoveQuoteDetailUseCase(quotes, details, advisorAccess),
    },
  ],
})
export class QuotesModule {}
