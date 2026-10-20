export class Route {
  constructor(
    public readonly id: number | null,
    public name: string,
    public zoneId: number,
    public executionDays: string | null,
    public frequency: string | null,
    public suggestedStartTime: string | null,
    public suggestedEndTime: string | null,
    public description: string | null,
    public advisorId: number,
    public startDate: Date,
    public endDate: Date | null,
    public status: string,
  ) {}
}
