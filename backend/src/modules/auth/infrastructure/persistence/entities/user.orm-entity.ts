import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user' })
export class UserOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'text' })
  id: string;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'email', type: 'text', unique: true })
  email: string;

  @Column({ name: 'emailVerified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ name: 'image', type: 'text', nullable: true })
  image?: string;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'role', type: 'text', default: 'advisor' })
  role: string;

  @Column({ name: 'banned', type: 'boolean', default: false })
  banned: boolean;

  @Column({ name: 'banReason', type: 'text', nullable: true })
  banReason?: string;

  @Column({ name: 'banExpires', type: 'timestamp', nullable: true })
  banExpires?: Date;
}
