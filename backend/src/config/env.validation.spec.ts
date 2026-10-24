import {
  DEVELOPMENT_BETTER_AUTH_SECRET,
  NodeEnvironment,
  parseCorsOrigins,
  validateEnv,
} from './env.validation.js';

const validEnv = {
  NODE_ENV: 'production',
  PORT: '8080',
  CORS_ORIGIN: 'http://localhost:5173',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'cmp_user',
  DB_PASSWORD: 'cmp_password',
  DB_NAME: 'cmp_db',
  DB_SSL: 'true',
  BETTER_AUTH_SECRET: 'test_only_production_secret_0123456789abcdef',
};

describe('validateEnv - BETTER_AUTH_SECRET', () => {
  it('fails in production when the secret is missing', () => {
    const env: Record<string, string> = { ...validEnv };
    delete env.BETTER_AUTH_SECRET;

    expect(() => validateEnv(env)).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('fails in production with the .env.example secret', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        BETTER_AUTH_SECRET: DEVELOPMENT_BETTER_AUTH_SECRET,
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('fails in production with a secret shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...validEnv, BETTER_AUTH_SECRET: 'too-short' }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('falls back to the development secret outside production', () => {
    const env: Record<string, string> = {
      ...validEnv,
      NODE_ENV: 'development',
    };
    delete env.BETTER_AUTH_SECRET;

    expect(validateEnv(env).BETTER_AUTH_SECRET).toBe(
      DEVELOPMENT_BETTER_AUTH_SECRET,
    );
  });
});

describe('validateEnv', () => {
  it('converts valid variables to their types', () => {
    const env = validateEnv(validEnv);

    expect(env.NODE_ENV).toBe(NodeEnvironment.Production);
    expect(env.PORT).toBe(8080);
    expect(env.DB_PORT).toBe(5432);
    expect(env.DB_SSL).toBe(true);
  });

  it('applies defaults for NODE_ENV, PORT, DB_SSL and VISIT_CHECKIN_RADIUS_METERS', () => {
    const required: Record<string, string> = { ...validEnv };
    delete required.NODE_ENV;
    delete required.PORT;
    delete required.DB_SSL;

    const env = validateEnv(required);

    expect(env.NODE_ENV).toBe(NodeEnvironment.Development);
    expect(env.PORT).toBe(3000);
    expect(env.DB_SSL).toBe(false);
    expect(env.VISIT_CHECKIN_RADIUS_METERS).toBe(15);
  });

  it('reads a custom VISIT_CHECKIN_RADIUS_METERS', () => {
    expect(
      validateEnv({ ...validEnv, VISIT_CHECKIN_RADIUS_METERS: '25' })
        .VISIT_CHECKIN_RADIUS_METERS,
    ).toBe(25);
  });

  it.each(['0', '-5', 'abc'])(
    'fails when VISIT_CHECKIN_RADIUS_METERS is invalid (%s)',
    (value) => {
      expect(() =>
        validateEnv({ ...validEnv, VISIT_CHECKIN_RADIUS_METERS: value }),
      ).toThrow(/Invalid environment variables/);
    },
  );

  it('reads DB_SSL="false" as false', () => {
    expect(validateEnv({ ...validEnv, DB_SSL: 'false' }).DB_SSL).toBe(false);
  });

  it.each([
    'CORS_ORIGIN',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ])('fails when %s is missing', (key) => {
    const env: Record<string, string> = { ...validEnv };
    delete env[key];

    expect(() => validateEnv(env)).toThrow(/Invalid environment variables/);
  });

  it.each([
    ['NODE_ENV', 'staging'],
    ['PORT', 'abc'],
    ['DB_PORT', '70000'],
    ['DB_SSL', 'yes'],
  ])('fails when %s has an invalid value (%s)', (key, value) => {
    expect(() => validateEnv({ ...validEnv, [key]: value })).toThrow(
      /Invalid environment variables/,
    );
  });
});

describe('parseCorsOrigins', () => {
  it('splits a comma-separated list', () => {
    expect(parseCorsOrigins('http://a.com, http://b.com,')).toEqual([
      'http://a.com',
      'http://b.com',
    ]);
  });
});
