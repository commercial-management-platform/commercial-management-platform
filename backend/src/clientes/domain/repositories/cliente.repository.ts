import { Cliente } from '../entities/cliente.js';

/**REPOSITORY de DOMAIN solo es un contrato para el repository de Infrastructure
 * este define que acciones debe realizar, no le interesa logica, le interesa la base necesaria
 */
export abstract class ClienteRepository {

  abstract findById(idCliente: number): Promise<Cliente | null>;

  abstract save(cliente: Cliente): Promise<Cliente>;
}
