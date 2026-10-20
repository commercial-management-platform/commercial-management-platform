import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'CLIENTE' })
export class ClienteOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  idCliente: number;

  @Column({ name: 'nit' })
  nit: string;

  @Column({ name: 'razon_social' })
  razonSocial: string;

  @Column({ name: 'nombre_comercial' })
  nombreComercial: string;

  @Column({ name: 'direccion' })
  direccion: string;

  @Column({ name: 'departamento' })
  departamento: string;

  @Column({ name: 'municipio' })
  municipio: string;

  @Column({ name: 'barrio' })
  barrio: string;

  @Column({ name: 'telefono' })
  telefono: string;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'id_zona' })
  idZona: number;

  @Column({ name: 'id_tipo_cliente' })
  idTipoCliente: number;

  @Column({ name: 'id_potencial' })
  idPotencial: number;

  @Column({ name: 'id_estado_cliente' })
  idEstadoCliente: number;

  @Column({ name: 'frecuencia_visita_dias' })
  frecuenciaVisitaDias: number;

  @Column({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @Column({ name: 'activo' })
  activo: boolean;
}