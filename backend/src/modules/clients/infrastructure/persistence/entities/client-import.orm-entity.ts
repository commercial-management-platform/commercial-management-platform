import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'client_import' })
export class ClientImportOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'file_key', type: 'varchar' })
  fileKey: string;

  @Column({ name: 'total_rows', type: 'integer' })
  totalRows: number;

  @Column({ name: 'imported_rows', type: 'integer', default: 0 })
  importedRows: number;

  @Column({ name: 'error_rows', type: 'integer', default: 0 })
  errorRows: number;

  @Column({ name: 'status', type: 'varchar', default: 'validated' })
  status: 'validated' | 'imported' | 'failed';

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
