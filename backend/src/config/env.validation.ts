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

  @IsString()
  @IsNotEmpty()
  BETTER_AUTH_SECRET: string = 'cmp_default_secret_key_change_in_prod_1234567890';

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

  return validated;
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
