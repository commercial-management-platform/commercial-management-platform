import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation.js';
import { typeOrmConfig } from './config/typeorm.config.js';
import { HealthModule } from './modules/health/health.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';

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
  ],
})
export class AppModule {}
