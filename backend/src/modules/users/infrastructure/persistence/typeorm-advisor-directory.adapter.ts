import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvisorOrmEntity } from './entities/advisor.orm-entity.js';
import type {
  Advisor,
  AdvisorDirectoryPort,
} from '../../application/ports/advisor-directory.port.js';
import { AdvisorStatus } from '../../application/ports/advisor-profile.port.js';

@Injectable()
export class TypeOrmAdvisorDirectoryAdapter implements AdvisorDirectoryPort {
  constructor(
    @InjectRepository(AdvisorOrmEntity)
    private readonly ormRepository: Repository<AdvisorOrmEntity>,
  ) {}

  async findAll(options: { includeInactive: boolean }): Promise<Advisor[]> {
    const rows = await this.ormRepository.find({
      where: options.includeInactive ? {} : { status: AdvisorStatus.Active },
      order: { name: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status as AdvisorStatus,
    }));
  }
}
