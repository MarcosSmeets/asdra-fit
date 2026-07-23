import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './authenticated-request';

interface ErrorBody {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  correlationId?: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'InternalServerError';
    let message = 'Ocorreu um erro inesperado.';
    let details: unknown;

    if (exception instanceof ZodValidationException || exception instanceof ZodError) {
      const zodError =
        exception instanceof ZodValidationException
          ? (exception.getZodError() as ZodError)
          : exception;
      statusCode = HttpStatus.BAD_REQUEST;
      error = 'ValidationError';
      message = 'Dados inválidos.';
      details = zodError.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      error = exception.name.replace(/Exception$/, '');
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const body = res as { message?: unknown; error?: unknown };
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : String(body.message ?? message);
        if (typeof body.error === 'string') {
          error = body.error;
        }
      }
    } else if (exception instanceof Error) {
      // Não vaza mensagens internas ao cliente em 500.
      this.logger.error(`${exception.name}: ${exception.message}`, exception.stack);
    }

    if (statusCode >= 500) {
      this.logger.error(`[${request.correlationId ?? '-'}] ${request.method} ${request.url}`);
    }

    const body: ErrorBody = {
      success: false,
      statusCode,
      error,
      message,
      details,
      correlationId: request.correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}
