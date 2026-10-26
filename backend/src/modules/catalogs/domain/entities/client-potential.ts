export class ClientPotential {
  constructor(
    public readonly id: number | null,
    public name: string,
    public order: number,
    public active: boolean,
  ) {}
}
