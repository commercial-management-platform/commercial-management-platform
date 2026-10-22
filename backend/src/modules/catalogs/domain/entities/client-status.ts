export class ClientStatus {
  constructor(
    public readonly id: number | null,
    public name: string,
    public active: boolean,
  ) {}
}
