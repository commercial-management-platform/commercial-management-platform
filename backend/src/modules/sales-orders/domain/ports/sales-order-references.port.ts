export const SALES_ORDER_REFERENCES = Symbol('SALES_ORDER_REFERENCES');

export interface SalesOrderClientReference {
  id: number;
  active: boolean;
}
export interface SalesOrderAdvisorReference {
  id: number;
  active: boolean;
}
export interface SalesOrderVisitReference {
  id: number;
  clientId: number;
  advisorId: number;
}
export interface SalesOrderQuoteReference {
  id: number;
  clientId: number;
  advisorId: number;
  value: string;
}

export interface SalesOrderReferencesPort {
  findClient(clientId: number): Promise<SalesOrderClientReference | null>;
  findAdvisor(advisorId: number): Promise<SalesOrderAdvisorReference | null>;
  findAdvisorByUserId(
    userId: string,
  ): Promise<SalesOrderAdvisorReference | null>;
  findVisit(visitId: number): Promise<SalesOrderVisitReference | null>;
  findQuote(quoteId: number): Promise<SalesOrderQuoteReference | null>;
}
