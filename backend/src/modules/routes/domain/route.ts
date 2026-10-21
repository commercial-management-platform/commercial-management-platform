import type { RouteStatus } from './route-status.js';

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
    /** Calendar date as YYYY-MM-DD, kept as text so no time zone can shift it. */
    public startDate: string,
    public endDate: string | null,
    public status: RouteStatus,
  ) {}
}
