import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../domain/errors/index.js';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

const STATUS_BY_ERROR = new Map<
  abstract new (...args: never[]) => DomainError,
  HttpStatus
>([
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [UnauthorizedError, HttpStatus.UNAUTHORIZED],
]);

const REASON_PHRASES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
};

/**
 * Translates domain errors into HTTP responses with the shape
 * { statusCode, error, message }. Never exposes stack traces.
 * A DomainError without a specific mapping is answered as 400.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = resolveStatus(exception);

    const body: ErrorResponseBody = {
      statusCode,
      error: REASON_PHRASES[statusCode] ?? 'Error',
      message: exception.message,
    };

    response.status(statusCode).json(body);
  }
}

function resolveStatus(exception: DomainError): HttpStatus {
  for (const [errorClass, status] of STATUS_BY_ERROR) {
    if (exception instanceof errorClass) return status;
  }
  return HttpStatus.BAD_REQUEST;
}
