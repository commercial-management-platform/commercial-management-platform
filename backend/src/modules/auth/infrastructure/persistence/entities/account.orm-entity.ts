import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'account' })
export class AccountOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'text' })
  id: string;

  @Column({ name: 'accountId', type: 'text' })
  accountId: string;

  @Column({ name: 'providerId', type: 'text' })
  providerId: string;

  @Column({ name: 'userId', type: 'text' })
  userId: string;

  @Column({ name: 'accessToken', type: 'text', nullable: true })
  accessToken?: string;

  @Column({ name: 'refreshToken', type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ name: 'idToken', type: 'text', nullable: true })
  idToken?: string;

  @Column({ name: 'accessTokenExpiresAt', type: 'timestamp', nullable: true })
  accessTokenExpiresAt?: Date;

  @Column({ name: 'refreshTokenExpiresAt', type: 'timestamp', nullable: true })
  refreshTokenExpiresAt?: Date;

  @Column({ name: 'scope', type: 'text', nullable: true })
  scope?: string;

  @Column({ name: 'password', type: 'text', nullable: true })
  password?: string;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
