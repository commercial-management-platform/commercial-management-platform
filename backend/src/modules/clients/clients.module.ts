import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CLIENT_REPOSITORY } from './domain/client.repository.js';
import { TypeOrmClientRepository } from './infrastructure/repositories/client.repository.impl.js';
import { ClientOrmEntity } from './infrastructure/persistence/entities/client.orm-entity.js';
import { ClienteRepository } from './domain/repositories/cliente.repository.js';
import { ClienteDao } from './infrastructure/persistence/daos/cliente.dao.js';
import { ClienteOrmEntity } from './infrastructure/persistence/entities/cliente.orm-entity.js';
import { ContactoClienteOrmEntity } from './infrastructure/persistence/entities/contacto-cliente.orm-entity.js';
import { HistorialClienteOrmEntity } from './infrastructure/persistence/entities/historial.orm-entity.js';
import { ClienteRepositoryImpl } from './infrastructure/repositories/cliente.repository.impl.js';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientOrmEntity,
      ClienteOrmEntity,
      ContactoClienteOrmEntity,
      HistorialClienteOrmEntity,
    ]),
  ],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    ClienteDao,
    { provide: ClienteRepository, useClass: ClienteRepositoryImpl },
  ],
  exports: [CLIENT_REPOSITORY, ClienteRepository],
})
export class ClientsModule {}
