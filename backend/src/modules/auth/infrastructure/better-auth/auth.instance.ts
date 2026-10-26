import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import pg from 'pg';
import type { EnvironmentVariables } from '../../../../config/env.validation.js';

const { Pool } = pg;

export type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;

export function createBetterAuthInstance(
  env: Pick<
    EnvironmentVariables,
    | 'DB_HOST'
    | 'DB_PORT'
    | 'DB_USER'
    | 'DB_PASSWORD'
    | 'DB_NAME'
    | 'DB_SSL'
    | 'BETTER_AUTH_SECRET'
    | 'BETTER_AUTH_URL'
  >,
  poolOverride?: pg.Pool,
) {
  const pool =
    poolOverride ??
    new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
      max: 10,
    });

  return betterAuth({
    database: pool,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
    },
    plugins: [
      admin({
        defaultRole: 'advisor',
        adminRoles: ['admin'],
      }),
      bearer(),
    ],
  });
}
