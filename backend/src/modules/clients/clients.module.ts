import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CLIENT_REPOSITORY } from './domain/client.repository.js';
import { TypeOrmClientRepository } from './infrastructure/repositories/client.repository.impl.js';
import { ClientOrmEntity } from './infrastructure/persistence/entities/client.orm-entity.js';
import { ContactoClienteOrmEntity } from './infrastructure/persistence/entities/contacto-cliente.orm-entity.js';
import { HistorialClienteOrmEntity } from './infrastructure/persistence/entities/historial.orm-entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientOrmEntity,
      ContactoClienteOrmEntity,
      HistorialClienteOrmEntity,
    ]),
  ],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
  ],
  exports: [CLIENT_REPOSITORY],
})
export class ClientsModule {}
