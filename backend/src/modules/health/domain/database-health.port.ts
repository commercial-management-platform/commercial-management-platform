/** Port: checks whether the database answers. Implemented in infrastructure. */
export interface DatabaseHealthPort {
  isUp(): Promise<boolean>;
}

export const DATABASE_HEALTH_PORT = Symbol('DATABASE_HEALTH_PORT');
