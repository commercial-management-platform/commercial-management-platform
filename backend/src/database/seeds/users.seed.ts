import type { DataSource } from 'typeorm';
import pg from 'pg';
import type { Seed } from './seed.js';
import { validateEnv } from '../../config/env.validation.js';
import {
  createBetterAuthInstance,
  type BetterAuthInstance,
} from '../../modules/auth/infrastructure/better-auth/auth.instance.js';
import { UserRole } from '../../modules/auth/domain/types/user-role.enum.js';
import { AdvisorStatus } from '../../modules/users/application/ports/advisor-profile.port.js';
import { AdvisorOrmEntity } from '../../modules/users/infrastructure/persistence/entities/advisor.orm-entity.js';
import { TypeOrmAdvisorProfileAdapter } from '../../modules/users/infrastructure/persistence/typeorm-advisor-profile.adapter.js';

interface SeedAccount {
  role: UserRole;
  /** Prefix of the SEED_<ROLE>_EMAIL, _PASSWORD and _NAME variables. */
  envPrefix: string;
  defaultName: string;
}

interface ExistingUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  { role: UserRole.Admin, envPrefix: 'SEED_ADMIN', defaultName: 'Administrador' },
  {
    role: UserRole.Director,
    envPrefix: 'SEED_DIRECTOR',
    defaultName: 'Director Comercial',
  },
  {
    role: UserRole.Advisor,
    envPrefix: 'SEED_ADVISOR',
    defaultName: 'Asesor Comercial',
  },
];

/**
 * Demo advisors (fictitious names used across the UI designs). They share the
 * SEED_DEMO_PASSWORD password and are skipped when it is not set.
 */
const DEMO_ADVISORS: { name: string; email: string }[] = [
  { name: 'Andrea Méndez', email: 'andrea.mendez@kestrel.demo' },
  { name: 'Carlos Núñez', email: 'carlos.nunez@kestrel.demo' },
  { name: 'Laura Ruiz', email: 'laura.ruiz@kestrel.demo' },
  { name: 'Miguel Torres', email: 'miguel.torres@kestrel.demo' },
];

// Same rule as CreateUserUseCase.
const MIN_PASSWORD_LENGTH = 8;

/**
 * Creates one user per role through the betterAuth API, so passwords are
 * hashed into the account table. Credentials come from SEED_* variables; a
 * missing pair skips that user. Existing emails are left untouched, except
 * that the advisor user always gets its advisor record.
 */
export const usersSeed: Seed = {
  name: 'users',
  async run(dataSource: DataSource): Promise<void> {
    // Created on the first user to create, so a run with nothing to do opens no extra pool.
    let pool: pg.Pool | undefined;
    let auth: BetterAuthInstance | undefined;
    const getAuth = (): BetterAuthInstance => {
      if (!auth) {
        const env = validateEnv(process.env);
        pool = new pg.Pool({
          host: env.DB_HOST,
          port: env.DB_PORT,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: env.DB_NAME,
          ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
          max: 2,
        });
        auth = createBetterAuthInstance(env, pool);
      }
      return auth;
    };
    const advisorProfiles = new TypeOrmAdvisorProfileAdapter(
      dataSource.getRepository(AdvisorOrmEntity),
    );

    /** Creates the user if its email is new and, for advisors, ensures the advisor record. */
    const ensureAccount = async (
      role: UserRole,
      email: string,
      password: string,
      name: string,
    ): Promise<void> => {
      let user = await findUserByEmail(dataSource, email);
      if (user) {
        console.log(`  [users] ${role}: ${email} already exists, not created`);
      } else {
        await getAuth().api.createUser({
          body: {
            email,
            password,
            name,
            // The admin plugin types roles as its defaults ('user' | 'admin').
            role: role as unknown as 'admin',
          },
        });
        user = await findUserByEmail(dataSource, email);
        console.log(`  [users] ${role}: ${email} created`);
      }

      if (user && user.role === UserRole.Advisor) {
        await advisorProfiles.save({
          userId: user.id,
          name: user.name,
          email: user.email,
          status: user.banned ? AdvisorStatus.Inactive : AdvisorStatus.Active,
        });
        console.log(`  [users] advisor record ensured for ${email}`);
      }
    };

    try {
      for (const account of SEED_ACCOUNTS) {
        const email = process.env[`${account.envPrefix}_EMAIL`]
          ?.trim()
          .toLowerCase();
        const password = process.env[`${account.envPrefix}_PASSWORD`];
        const name =
          process.env[`${account.envPrefix}_NAME`]?.trim() ||
          account.defaultName;

        if (!email || !password) {
          console.warn(
            `  [users] ${account.role}: skipped, ${account.envPrefix}_EMAIL or ${account.envPrefix}_PASSWORD is not set`,
          );
          continue;
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
          console.warn(
            `  [users] ${account.role}: skipped, ${account.envPrefix}_PASSWORD must have at least ${MIN_PASSWORD_LENGTH} characters`,
          );
          continue;
        }

        await ensureAccount(account.role, email, password, name);
      }

      const demoPassword = process.env.SEED_DEMO_PASSWORD;
      if (!demoPassword || demoPassword.length < MIN_PASSWORD_LENGTH) {
        console.warn(
          `  [users] demo advisors: skipped, SEED_DEMO_PASSWORD is not set or has fewer than ${MIN_PASSWORD_LENGTH} characters`,
        );
      } else {
        for (const advisor of DEMO_ADVISORS) {
          await ensureAccount(
            UserRole.Advisor,
            advisor.email,
            demoPassword,
            advisor.name,
          );
        }
      }
    } finally {
      await pool?.end();
    }
  },
};

async function findUserByEmail(
  dataSource: DataSource,
  email: string,
): Promise<ExistingUserRow | null> {
  const rows: ExistingUserRow[] = await dataSource.query(
    `SELECT "id", "name", "email", "role", "banned" FROM "user" WHERE "email" = $1`,
    [email],
  );
  return rows[0] ?? null;
}
