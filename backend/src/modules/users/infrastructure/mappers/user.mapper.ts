import { UserOrmEntity } from '../../../auth/infrastructure/persistence/entities/user.orm-entity.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return new User({
      id: orm.id,
      name: orm.name,
      email: orm.email,
      role: (orm.role as UserRole) || UserRole.Advisor,
      isActive: !orm.banned,
      emailVerified: orm.emailVerified ?? false,
      image: orm.image ?? null,
      createdAt: orm.createdAt instanceof Date ? orm.createdAt : new Date(orm.createdAt),
      updatedAt: orm.updatedAt instanceof Date ? orm.updatedAt : new Date(orm.updatedAt),
    });
  }
}
