import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** Same value as backend/.env.example. Never valid in production. */
export const DEVELOPMENT_BETTER_AUTH_SECRET =
  'cmp_default_secret_key_change_in_prod_1234567890';

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Environment variables required by the application.
 * NODE_ENV, PORT and DB_SSL have defaults; the rest are mandatory.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  /** One origin or a comma-separated list of origins. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  // Implicit conversion would turn the string "false" into true.
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    parseBoolean(obj.DB_SSL),
  )
  @IsBoolean()
  DB_SSL: boolean = false;

  /** Development fallback only; validateEnv rejects it in production. */
  @IsString()
  @IsNotEmpty()
  BETTER_AUTH_SECRET: string = DEVELOPMENT_BETTER_AUTH_SECRET;

  @IsString()
  @IsNotEmpty()
  BETTER_AUTH_URL: string = 'http://localhost:3000';
}

function parseBoolean(value: unknown): unknown {
  if (value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Validates and converts raw environment variables.
 * Throws if a mandatory variable is missing or invalid, which stops the app at startup.
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment variables: ${details}`);
  }

  assertProductionSecret(validated);

  return validated;
}

/**
 * In production the betterAuth secret signs sessions, so a missing value
 * (which falls back to the default), the example value or a short one stops the app.
 */
function assertProductionSecret(env: EnvironmentVariables): void {
  if (env.NODE_ENV !== NodeEnvironment.Production) return;

  if (
    env.BETTER_AUTH_SECRET === DEVELOPMENT_BETTER_AUTH_SECRET ||
    env.BETTER_AUTH_SECRET.length < MIN_PRODUCTION_SECRET_LENGTH
  ) {
    throw new Error(
      `Invalid environment variables: BETTER_AUTH_SECRET must be set to a unique value of at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
