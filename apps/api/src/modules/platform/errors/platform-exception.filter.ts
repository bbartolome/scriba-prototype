import {
  BadRequestException,
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { z } from 'zod';
import {
  PLATFORM_ERROR_CODES,
  PLATFORM_ERROR_STATUS,
  type ErrorBody,
} from '@bbartolome/scriba-contracts/platform';
import { ModuleError } from './module-error';

// What the filter writes for one error. `unexpected` marks the 500 path, which is logged with its stack.
interface ErrorMapping {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  unexpected: boolean;
}

// Reads `cause` without express types: apps/api has no @types/express.
function causeOf(exception: unknown): unknown {
  return typeof exception === 'object' && exception !== null
    ? (exception as { cause?: unknown }).cause
    : undefined;
}

// Reads the `type` body-parser sets on its error, e.g. `entity.too.large`.
function typeOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null
    ? (error as { type?: unknown }).type
    : undefined;
}

// The mapping, checked in this order. Body-parser errors arrive as Nest exceptions with `cause` set.
function mapException(exception: unknown): ErrorMapping {
  if (exception instanceof ModuleError) {
    return {
      status: exception.status,
      code: exception.code,
      message: exception.message,
      details: exception.details,
      unexpected: false,
    };
  }
  if (exception instanceof z.ZodError) {
    return {
      status: PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
      code: PLATFORM_ERROR_CODES.VALIDATION_FAILED,
      message: 'Request body failed validation.',
      details: exception.issues,
      unexpected: false,
    };
  }
  if (exception instanceof HttpException && exception.getStatus() === 404) {
    return {
      status: PLATFORM_ERROR_STATUS.PLATFORM_NOT_FOUND,
      code: PLATFORM_ERROR_CODES.NOT_FOUND,
      message: 'Not found.',
      unexpected: false,
    };
  }
  if (
    exception instanceof HttpException &&
    exception.getStatus() === 413 &&
    typeOf(causeOf(exception)) === 'entity.too.large'
  ) {
    return {
      status: PLATFORM_ERROR_STATUS.PLATFORM_PAYLOAD_TOO_LARGE,
      code: PLATFORM_ERROR_CODES.PAYLOAD_TOO_LARGE,
      message: 'Request body is too large.',
      unexpected: false,
    };
  }
  if (
    exception instanceof BadRequestException &&
    causeOf(exception) instanceof SyntaxError &&
    typeOf(causeOf(exception)) === 'entity.parse.failed'
  ) {
    return {
      status: PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
      code: PLATFORM_ERROR_CODES.VALIDATION_FAILED,
      message: 'Request body is not valid JSON.',
      unexpected: false,
    };
  }
  return {
    status: PLATFORM_ERROR_STATUS.PLATFORM_INTERNAL,
    code: PLATFORM_ERROR_CODES.INTERNAL,
    message: 'Internal server error.',
    unexpected: true,
  };
}

// Maps every error to the base shape. Replies the way Nest's BaseExceptionFilter does, so a stream whose headers
// are already sent is ended rather than given a second response.
@Catch()
export class PlatformExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PlatformExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const mapped = mapException(exception);
    if (mapped.unexpected) {
      const error = exception instanceof Error ? exception : undefined;
      this.logger.error(
        error?.message ?? String(exception),
        error?.stack,
        PlatformExceptionFilter.name,
      );
    }
    const body: ErrorBody = {
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details === undefined ? {} : { details: mapped.details }),
      },
    };
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();
    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
    } else {
      httpAdapter.reply(response, body, mapped.status);
    }
  }
}
