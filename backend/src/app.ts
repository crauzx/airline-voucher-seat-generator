import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createVoucherRepository } from './db/voucherRepository';
import { createVoucherService } from './services/voucherService';
import { createCheckRoute } from './routes/checkRoute';
import { createGenerateRoute } from './routes/generateRoute';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { RateLimitOptions, createRateLimiter } from './middleware/rateLimit';
import { ApiError } from './errors/ApiError';
import { config } from './config';

export interface BuildAppOptions {
  corsOrigins?: string[];
  rateLimit?: RateLimitOptions | false;
}

// express.json() rejects unparseable and oversized bodies by throwing, which would
// otherwise reach the generic handler and surface as a 500. Both are client errors.
function bodyParserErrorHandler(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    next(ApiError.validation('Request body must be valid JSON'));
    return;
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    next(ApiError.validation('Request body is too large'));
    return;
  }
  next(err);
}

export function buildApp(db: Database.Database, options: BuildAppOptions = {}): Express {
  const repository = createVoucherRepository(db);
  const service = createVoucherService(repository);

  const app = express();
  app.set('trust proxy', config.trustProxy);

  const corsOrigins = options.corsOrigins ?? config.corsOrigins;
  app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false }));

  const rateLimit = options.rateLimit ?? config.rateLimit;
  if (rateLimit !== false) {
    app.use('/api', createRateLimiter(rateLimit));
  }

  app.use(express.json({ limit: '16kb' }));
  app.use(bodyParserErrorHandler);

  app.use('/api/check', createCheckRoute(service));
  app.use('/api/generate', createGenerateRoute(service));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
