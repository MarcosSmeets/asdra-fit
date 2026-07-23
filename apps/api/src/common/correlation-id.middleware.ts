import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './authenticated-request';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_ID_HEADER];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    req.correlationId = id;
    res.setHeader(CORRELATION_ID_HEADER, id);
    next();
  }
}
