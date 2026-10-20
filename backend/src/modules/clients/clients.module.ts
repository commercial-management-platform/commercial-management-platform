import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CLIENT_REPOSITORY } from './domain/client.repository.js';
import { TypeOrmClientRepository } from './infrastructure/repositories/client.repository.impl.js';
import { ClientOrmEntity } from './infrastructure/persistence/entities/client.orm-entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ClientOrmEntity])],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
  ],
  exports: [CLIENT_REPOSITORY],
})
export class ClientsModule {}
