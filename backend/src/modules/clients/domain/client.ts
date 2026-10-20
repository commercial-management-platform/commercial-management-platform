export class Client {
  constructor(
    public readonly id: number | null,
    /** Colombian tax ID. Unique per client. */
    public nit: string,
    public businessName: string,
    public tradeName: string | null,
    public address: string | null,
    public department: string | null,
    public municipality: string | null,
    public neighborhood: string | null,
    public phone: string | null,
    public email: string | null,
    public zoneId: number | null,
    public clientTypeId: number | null,
    public clientPotentialId: number | null,
    public clientStatusId: number | null,
    public visitFrequencyDays: number | null,
    public active: boolean,
    /** Set by the database on insert; null until the client is saved. */
    public readonly createdAt: Date | null,
  ) {}
}
