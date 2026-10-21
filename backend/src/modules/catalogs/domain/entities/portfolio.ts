export class Portfolio {
  constructor(
    public readonly id: number | null,
    public name: string,
    public description: string | null,
    public active: boolean,
  ) {}
}
