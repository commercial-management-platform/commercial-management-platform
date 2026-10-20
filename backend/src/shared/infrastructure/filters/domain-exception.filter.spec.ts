import type { ArgumentsHost } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../domain/errors/index.js';
import { DomainExceptionFilter } from './domain-exception.filter.js';

class UnmappedError extends DomainError {
  constructor() {
    super('Business rule violated');
  }
}

function createHost() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  it.each([
    [new NotFoundError('Client not found'), 404, 'Not Found'],
    [new ConflictError('NIT already registered'), 409, 'Conflict'],
    [new ForbiddenError('Not allowed'), 403, 'Forbidden'],
    [new UnauthorizedError('Invalid credentials'), 401, 'Unauthorized'],
    [new UnmappedError(), 400, 'Bad Request'],
  ])('maps %o to HTTP %i', (exception, statusCode, error) => {
    const { host, response } = createHost();

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(statusCode);
    expect(response.json).toHaveBeenCalledWith({
      statusCode,
      error,
      message: exception.message,
    });
  });

  it('does not expose the stack trace', () => {
    const { host, response } = createHost();

    filter.catch(new NotFoundError('Client not found'), host);

    const body = response.json.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      'error',
      'message',
      'statusCode',
    ]);
  });
});
