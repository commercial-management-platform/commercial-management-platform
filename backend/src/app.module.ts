import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation.js';
import { typeOrmConfig } from './config/typeorm.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogsModule } from './modules/catalogs/catalogs.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { UsersModule } from './modules/users/users.module.js';

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
    UsersModule,
    CatalogsModule,
  ],
})
export class AppModule {}
