export enum VisitStatus {
  Scheduled = 'scheduled',
  /** Set by HU-09 when the visit is recorded. */
  Visited = 'visited',
  Cancelled = 'cancelled',
}
