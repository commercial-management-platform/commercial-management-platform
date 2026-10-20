import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'CONTACTO_CLIENTE' })
export class ContactoClienteOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_contacto' })
  idContacto: number;

  @Column({ name: 'id_cliente' })
  idCliente: number;

  @Column({ name: 'nombre' })
  nombre: string;

  @Column({ name: 'cargo' })
  cargo: string;

  @Column({ name: 'telefono' })
  telefono: string;

  @Column({ name: 'celular' })
  celular: string;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'principal' })
  principal: boolean;
}