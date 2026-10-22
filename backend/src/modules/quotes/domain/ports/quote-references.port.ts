export const QUOTE_REFERENCES = Symbol('QUOTE_REFERENCES');

export interface QuoteClientReference {
  id: number;
  active: boolean;
}

export interface QuoteAdvisorReference {
  id: number;
  active: boolean;
}

export interface QuoteVisitReference {
  id: number;
  clientId: number;
  advisorId: number;
}

/** Read-only references owned by quotes, without leaking another module's ORM. */
export interface QuoteReferencesPort {
  findClient(clientId: number): Promise<QuoteClientReference | null>;
  findAdvisor(advisorId: number): Promise<QuoteAdvisorReference | null>;
  findAdvisorByUserId(userId: string): Promise<QuoteAdvisorReference | null>;
  findVisit(visitId: number): Promise<QuoteVisitReference | null>;
}
