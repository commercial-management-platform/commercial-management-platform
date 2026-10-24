import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { ClientImportStatus } from '../../../domain/ports/client-import.repository.js';

/**
 * Import of clients from CSV (HU-22). Names must match the migration
 * CreateClientImportTable1792690000000. The user FK is only in the migration:
 * the betterAuth user table has no ORM entity.
 */
@Entity({ name: 'client_import' })
@Check('CHK_client_import_status', `"status" IN ('validated', 'imported', 'failed')`)
@Index('IDX_client_import_created_at', ['createdAt'])
export class ClientImportOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id', primaryKeyConstraintName: 'PK_client_import_id' })
  id: number;

  @Column({ name: 'file_key', type: 'varchar', length: 255 })
  fileKey: string;

  @Column({ name: 'total_rows', type: 'integer' })
  totalRows: number;

  @Column({ name: 'imported_rows', type: 'integer', default: 0 })
  importedRows: number;

  @Column({ name: 'error_rows', type: 'integer', default: 0 })
  errorRows: number;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: ClientImportStatus;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
