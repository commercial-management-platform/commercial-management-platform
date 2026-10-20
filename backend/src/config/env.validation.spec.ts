import {
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
};

describe('validateEnv', () => {
  it('converts valid variables to their types', () => {
    const env = validateEnv(validEnv);

    expect(env.NODE_ENV).toBe(NodeEnvironment.Production);
    expect(env.PORT).toBe(8080);
    expect(env.DB_PORT).toBe(5432);
    expect(env.DB_SSL).toBe(true);
  });

  it('applies defaults for NODE_ENV, PORT and DB_SSL', () => {
    const required: Record<string, string> = { ...validEnv };
    delete required.NODE_ENV;
    delete required.PORT;
    delete required.DB_SSL;

    const env = validateEnv(required);

    expect(env.NODE_ENV).toBe(NodeEnvironment.Development);
    expect(env.PORT).toBe(3000);
    expect(env.DB_SSL).toBe(false);
  });

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
