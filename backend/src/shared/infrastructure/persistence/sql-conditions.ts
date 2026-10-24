/**
 * Collects WHERE conditions with numbered placeholders ($1, $2...) for the
 * read-only SQL of the dashboard and the reports.
 */
export class SqlConditions {
  readonly params: unknown[] = [];
  private readonly conditions: string[] = [];

  /** `sql` uses `?` where the value goes, e.g. 'v.status = ?'. */
  add(sql: string, value: unknown): void {
    this.params.push(value);
    this.conditions.push(sql.replace('?', `$${this.params.length}`));
  }

  toSql(): string {
    return this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';
  }
}
