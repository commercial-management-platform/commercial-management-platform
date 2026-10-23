import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation.js';
import { typeOrmConfig } from './config/typeorm.config.js';
import { ActivityLogModule } from './modules/activity-log/activity-log.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogsModule } from './modules/catalogs/catalogs.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PortfoliosModule } from './modules/portfolios/portfolios.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VisitsModule } from './modules/visits/visits.module.js';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module.js';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    HealthModule,
    RoutesModule,
    AuthModule,
    ClientsModule,
    ContactsModule,
    UsersModule,
    CatalogsModule,
    PortfoliosModule,
    VisitsModule,
    FollowUpsModule,
    QuotesModule,
    SalesOrdersModule,
    ActivityLogModule,
  ],
})
export class AppModule {}
