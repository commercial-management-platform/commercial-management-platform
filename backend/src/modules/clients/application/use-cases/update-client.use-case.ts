import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import { NIT_PATTERN } from '../../domain/entities/client.js';
import type { Client } from '../../domain/entities/client.js';
import type {
  ClientRepository,
  UpdateClientData,
} from '../../domain/repositories/client.repository.js';
import { assertCatalogsExist } from '../catalog-validation.js';
import type { ActivityLogPort } from '../ports/activity-log.port.js';
import type { AdvisorClientAccessPort } from '../ports/advisor-client-access.port.js';
import type { CatalogValidatorPort } from '../ports/catalog-validator.port.js';
import type { ClientActor } from '../types/client-actor.js';

export interface UpdateClientInput {
  actor: ClientActor;
  clientId: number;
  data: UpdateClientData;
}

export class UpdateClientUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly catalogs: CatalogValidatorPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: UpdateClientInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) {
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    if (
      input.actor.role === UserRole.Advisor &&
      !(await this.advisorAccess.canAccess(input.actor.id, input.clientId))
    ) {
      // Answer as not found so clients outside the advisor's routes are not
      // revealed (404 instead of 403).
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    // The transport may deliver every decorated field as an own property,
    // with an explicit undefined when it was not sent. Undefined means
    // "not provided" and must never overwrite the stored value.
    const data: UpdateClientData = { ...input.data };
    for (const key of Object.keys(data) as (keyof UpdateClientData)[]) {
      if (data[key] === undefined) {
        delete data[key];
      }
    }

    if (data.nit !== undefined) {
      const nit = data.nit.trim();
      if (!nit) {
        throw new ValidationError('nit must not be empty');
      }
      if (!NIT_PATTERN.test(nit)) {
        throw new ValidationError(
          'nit must be a valid Colombian NIT: 9 to 10 digits with an optional hyphen',
        );
      }
      // The NIT is unique across the system (409 on duplicates).
      if (nit !== client.nit && (await this.clients.findByNit(nit))) {
        throw new ConflictError('A client with the same NIT already exists');
      }
      data.nit = nit;
    }

    if (data.businessName !== undefined) {
      const businessName = data.businessName.trim();
      if (!businessName) {
        throw new ValidationError('businessName must not be empty');
      }
      data.businessName = businessName;
    }

    await assertCatalogsExist(this.catalogs, {
      zone: data.zoneId,
      client_type: data.clientTypeId,
      client_potential: data.clientPotentialId,
      client_status: data.clientStatusId,
    });

    const updated = await this.clients.update(input.clientId, data);

    await this.activityLog.record({
      action: 'client.updated',
      userId: input.actor.id,
      // update() persists the entity; its id always exists.
      clientId: updated.id!,
      description: `Client '${updated.businessName}' (NIT ${updated.nit}) updated`,
      occurredAt: new Date(),
    });

    return updated;
  }
}
