import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'verification' })
export class VerificationOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'text' })
  id: string;

  @Column({ name: 'identifier', type: 'text' })
  identifier: string;

  @Column({ name: 'value', type: 'text' })
  value: string;

  @Column({ name: 'expiresAt', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
