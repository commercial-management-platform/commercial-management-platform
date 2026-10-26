import type { Client } from '../entities/client.js';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientFilterOptions {
  search?: string;
  active?: boolean;
  zoneId?: number;
  clientTypeId?: number;
  clientPotentialId?: number;
  clientStatusId?: number;
  /** When set, only clients with these ids are returned (advisor visibility). */
  ids?: number[];
}

export interface UpdateClientData {
  nit?: string;
  businessName?: string;
  tradeName?: string | null;
  address?: string | null;
  department?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  phone?: string | null;
  email?: string | null;
  zoneId?: number | null;
  clientTypeId?: number | null;
  clientPotentialId?: number | null;
  clientStatusId?: number | null;
  visitFrequencyDays?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean;
}

export interface ClientRepository {
  findAll(options?: ClientFilterOptions): Promise<Client[]>;
  findById(id: number): Promise<Client | null>;
  findByNit(nit: string): Promise<Client | null>;
  save(client: Client): Promise<Client>;
  update(id: number, data: UpdateClientData): Promise<Client>;
}
