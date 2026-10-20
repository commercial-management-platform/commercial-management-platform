export type DatabaseStatus = 'up' | 'down';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: DatabaseStatus;
}
