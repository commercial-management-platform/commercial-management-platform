import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteRepository } from './domain/repositories/cliente.repository.js';
import { ClienteDao } from './infrastructure/persistence/daos/cliente.dao.js';
import { ClienteOrmEntity } from './infrastructure/persistence/entities/cliente.orm-entity.js';
import { ContactoClienteOrmEntity } from './infrastructure/persistence/entities/contacto-cliente.orm-entity.js';
import { HistorialClienteOrmEntity } from './infrastructure/persistence/entities/historial.orm-entity.js';
import { ClienteRepositoryImpl } from './infrastructure/repositories/cliente.repository.impl.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClienteOrmEntity,
      ContactoClienteOrmEntity,
      HistorialClienteOrmEntity,
    ]),
  ],
  providers: [
    ClienteDao,
    { provide: ClienteRepository, useClass: ClienteRepositoryImpl },
  ],
  exports: [ClienteRepository],
})
export class ClientsModule {}
