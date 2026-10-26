import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'session' })
export class SessionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'text' })
  id: string;

  @Column({ name: 'expiresAt', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'token', type: 'text', unique: true })
  token: string;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'ipAddress', type: 'text', nullable: true })
  ipAddress?: string;

  @Column({ name: 'userAgent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'userId', type: 'text' })
  userId: string;

  @Column({ name: 'impersonatedBy', type: 'text', nullable: true })
  impersonatedBy?: string;
}
