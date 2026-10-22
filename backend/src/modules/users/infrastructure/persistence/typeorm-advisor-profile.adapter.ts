import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvisorOrmEntity } from './entities/advisor.orm-entity.js';
import {
  AdvisorProfileData,
  AdvisorProfilePort,
  AdvisorStatus,
} from '../../application/ports/advisor-profile.port.js';

@Injectable()
export class TypeOrmAdvisorProfileAdapter implements AdvisorProfilePort {
  constructor(
    @InjectRepository(AdvisorOrmEntity)
    private readonly ormRepository: Repository<AdvisorOrmEntity>,
  ) {}

  async save(data: AdvisorProfileData): Promise<void> {
    // Single statement on the unique user_id, so concurrent calls cannot duplicate it.
    await this.ormRepository
      .createQueryBuilder()
      .insert()
      .into(AdvisorOrmEntity)
      .values({
        userId: data.userId,
        name: data.name,
        email: data.email,
        status: data.status,
      })
      .orUpdate(['name', 'email', 'status', 'updated_at'], ['user_id'])
      .execute();
  }

  async deactivate(userId: string): Promise<void> {
    await this.ormRepository.update(
      { userId },
      { status: AdvisorStatus.Inactive },
    );
  }
}
