import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ZoneOrmEntity } from '../entities/zone.orm-entity.js';
import { ClientTypeOrmEntity } from '../entities/client-type.orm-entity.js';
import { ClientPotentialOrmEntity } from '../entities/client-potential.orm-entity.js';
import { ClientStatusOrmEntity } from '../entities/client-status.orm-entity.js';
import { VisitResultOrmEntity } from '../entities/visit-result.orm-entity.js';
import { VisitObjectiveOrmEntity } from '../entities/visit-objective.orm-entity.js';
import { VisitTypeOrmEntity } from '../entities/visit-type.orm-entity.js';
import { PortfolioOrmEntity } from '../entities/portfolio.orm-entity.js';

type CatalogOrmEntity =
  | ZoneOrmEntity
  | ClientTypeOrmEntity
  | ClientPotentialOrmEntity
  | ClientStatusOrmEntity
  | VisitResultOrmEntity
  | VisitObjectiveOrmEntity
  | VisitTypeOrmEntity
  | PortfolioOrmEntity;

@Injectable()
export class CatalogDao {
  constructor(
    @InjectRepository(ZoneOrmEntity)
    private readonly zoneRepository: Repository<ZoneOrmEntity>,

    @InjectRepository(ClientTypeOrmEntity)
    private readonly clientTypeRepository: Repository<ClientTypeOrmEntity>,

    @InjectRepository(ClientPotentialOrmEntity)
    private readonly clientPotentialRepository: Repository<ClientPotentialOrmEntity>,

    @InjectRepository(ClientStatusOrmEntity)
    private readonly clientStatusRepository: Repository<ClientStatusOrmEntity>,

    @InjectRepository(VisitResultOrmEntity)
    private readonly visitResultRepository: Repository<VisitResultOrmEntity>,

    @InjectRepository(VisitObjectiveOrmEntity)
    private readonly visitObjectiveRepository: Repository<VisitObjectiveOrmEntity>,

    @InjectRepository(VisitTypeOrmEntity)
    private readonly visitTypeRepository: Repository<VisitTypeOrmEntity>,

    @InjectRepository(PortfolioOrmEntity)
    private readonly portfolioRepository: Repository<PortfolioOrmEntity>,
  ) {}

  private getRepository(type: string): Repository<any> {
    switch (type) {
      case 'zone':
        return this.zoneRepository;

      case 'clientType':
        return this.clientTypeRepository;

      case 'clientPotential':
        return this.clientPotentialRepository;

      case 'clientStatus':
        return this.clientStatusRepository;

      case 'visitResult':
        return this.visitResultRepository;

      case 'visitObjective':
        return this.visitObjectiveRepository;

      case 'visitType':
        return this.visitTypeRepository;

      case 'portfolio':
        return this.portfolioRepository;

      default:
        throw new Error(`Unsupported catalog type: ${type}`);
    }
  }

  async findAll(type: string): Promise<CatalogOrmEntity[]> {
    return this.getRepository(type).find({
      order:
        type === 'clientPotential'
          ? { order: 'ASC', name: 'ASC' }
          : { name: 'ASC' },
    });
  }

  async findById(type: string, id: number): Promise<CatalogOrmEntity | null> {
    return this.getRepository(type).findOne({
      where: {
        id,
      },
    });
  }

  async findByName(
    type: string,
    name: string,
  ): Promise<CatalogOrmEntity | null> {
    return this.getRepository(type)
      .createQueryBuilder('catalog')
      .where('LOWER(catalog.name) = LOWER(:name)', { name })
      .getOne();
  }

  async save(
    type: string,
    entity: CatalogOrmEntity,
  ): Promise<CatalogOrmEntity> {
    return this.getRepository(type).save(entity);
  }

  async update(
    type: string,
    id: number,
    data: Partial<CatalogOrmEntity>,
  ): Promise<CatalogOrmEntity> {
    const repository = this.getRepository(type);

    await repository.update(id, data);

    return repository.findOne({
      where: {
        id,
      },
    });
  }

  async delete(type: string, id: number): Promise<void> {
    await this.getRepository(type).delete(id);
  }
}
