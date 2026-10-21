export class RouteClient {
  constructor(
    public readonly id: number | null,
    public routeId: number,
    public clientId: number,
    public visitOrder: number,
  ) {}
}
