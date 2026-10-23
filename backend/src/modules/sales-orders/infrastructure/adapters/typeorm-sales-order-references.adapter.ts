import { Injectable } from '@nestjs/common';
import type { SalesOrderReferencesPort } from '../../domain/ports/sales-order-references.port.js';
import { SalesOrderReferencesDao } from '../persistence/daos/sales-order-references.dao.js';

@Injectable()
export class TypeOrmSalesOrderReferencesAdapter implements SalesOrderReferencesPort {
  constructor(private readonly dao: SalesOrderReferencesDao) {}
  findClient(id: number) {
    return this.dao.findClient(id);
  }
  findAdvisor(id: number) {
    return this.dao.findAdvisor(id);
  }
  findAdvisorByUserId(id: string) {
    return this.dao.findAdvisorByUserId(id);
  }
  findVisit(id: number) {
    return this.dao.findVisit(id);
  }
  findQuote(id: number) {
    return this.dao.findQuote(id);
  }
}
