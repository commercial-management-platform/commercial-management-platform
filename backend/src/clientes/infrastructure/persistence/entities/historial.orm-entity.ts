import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'HISTORIAL_CLIENTE' })
export class HistorialClienteOrmEntity {
    
  @PrimaryGeneratedColumn({ name: 'id_historial' })
  idHistorial: number;

  @Column({ name: 'id_cliente' })
  idCliente: number;

  @Column({ name: 'fecha' })
  fecha: Date;

  @Column({ name: 'accion' })
  accion: string;

  @Column({ name: 'usuario' })
  usuario: string;

  @Column({ name: 'descripcion' })
  descripcion: string;
}