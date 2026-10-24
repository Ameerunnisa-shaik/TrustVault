import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[TrustVault Error Handler]:', err);

  const status = err.status || err.statusCode || 500;
  const message =
    config.nodeEnv === 'production' && status === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    code: err.code || 'SERVER_ERROR',
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
}
