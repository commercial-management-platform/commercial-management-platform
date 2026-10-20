import type { Client } from './client.js';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientRepository {
  findById(id: number): Promise<Client | null>;
  save(client: Client): Promise<Client>;
}
