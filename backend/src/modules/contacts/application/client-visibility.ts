import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../shared/domain/errors/index.js';
import type { Client } from '../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../clients/domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../../clients/application/ports/advisor-client-access.port.js';
import type { ContactActor } from './types/contact-actor.js';

/**
 * Resolves the client of a contact operation.
 *
 * The client must exist and, when the actor is an advisor, it must be on one
 * of their routes. A client out of the advisor's routes answers as not found
 * (404 instead of 403) so its existence is not revealed, the same rule the
 * clients module applies.
 */
export async function findVisibleClient(
  clients: ClientRepository,
  advisorAccess: AdvisorClientAccessPort,
  actor: ContactActor,
  clientId: number,
): Promise<Client> {
  const client = await clients.findById(clientId);
  if (!client) {
    throw new NotFoundError(`Client with id '${clientId}' not found`);
  }

  if (
    actor.role === UserRole.Advisor &&
    !(await advisorAccess.canAccess(actor.id, clientId))
  ) {
    throw new NotFoundError(`Client with id '${clientId}' not found`);
  }

  return client;
}
