import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/entities/user.orm-entity.js';
import {
  UserRepository,
  UserFilterOptions,
  UpdateUserData,
} from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { UserMapper } from '../mappers/user.mapper.js';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/errors/index.js';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly ormRepository: Repository<UserOrmEntity>,
  ) {}

  async findAll(options?: UserFilterOptions): Promise<User[]> {
    const qb = this.ormRepository.createQueryBuilder('user');

    if (options?.role) {
      qb.andWhere('user.role = :role', { role: options.role });
    }

    if (options?.isActive !== undefined) {
      qb.andWhere('user.banned = :banned', { banned: !options.isActive });
    }

    if (options?.search && options.search.trim().length > 0) {
      const search = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search },
      );
    }

    qb.orderBy('user.createdAt', 'DESC');

    const entities = await qb.getMany();
    return entities.map(UserMapper.toDomain);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.ormRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async countActiveAdmins(): Promise<number> {
    return this.ormRepository.count({
      where: {
        role: UserRole.Admin,
        banned: false,
      },
    });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.ormRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Find target user inside transaction
        const entity = await transactionalEntityManager.findOne(UserOrmEntity, {
          where: { id },
        });

        if (!entity) {
          throw new NotFoundError(`User with id '${id}' not found`);
        }

        const isCurrentlyActiveAdmin =
          entity.role === UserRole.Admin && !entity.banned;
        const isDemotingAdmin =
          data.role !== undefined && data.role !== UserRole.Admin;
        const isDeactivatingAdmin = data.isActive === false;

        // CA-08 Concurrency Protection:
        // If the operation would reduce the active administrator pool,
        // lock ALL active administrator rows with SELECT ... FOR UPDATE (pessimistic_write).
        // This serializes any concurrent requests and guarantees that no race condition
        // can leave the platform with 0 active administrators.
        if (
          isCurrentlyActiveAdmin &&
          (isDemotingAdmin || isDeactivatingAdmin)
        ) {
          const activeAdmins = await transactionalEntityManager
            .createQueryBuilder(UserOrmEntity, 'user')
            .setLock('pessimistic_write')
            .where('user.role = :role AND user.banned = :banned', {
              role: UserRole.Admin,
              banned: false,
            })
            .getMany();

          if (activeAdmins.length <= 1) {
            if (isDemotingAdmin) {
              throw new ConflictError(
                'Cannot change role: the platform must have at least one active administrator',
              );
            }
            if (isDeactivatingAdmin) {
              throw new ConflictError(
                'Cannot deactivate the last active administrator',
              );
            }
          }
        }

        if (data.name !== undefined) {
          entity.name = data.name;
        }
        if (data.image !== undefined) {
          entity.image = data.image ?? undefined;
        }
        if (data.role !== undefined) {
          entity.role = data.role;
        }
        if (data.isActive !== undefined) {
          entity.banned = !data.isActive;
          if (!data.isActive) {
            entity.banReason = 'Deactivated by administrator';
          } else {
            entity.banReason = undefined;
            entity.banExpires = undefined;
          }
        }

        entity.updatedAt = new Date();
        const saved = await transactionalEntityManager.save(
          UserOrmEntity,
          entity,
        );
        return UserMapper.toDomain(saved);
      },
    );
  }
}
