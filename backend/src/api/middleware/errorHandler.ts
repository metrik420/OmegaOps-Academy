/**
 * FILE: src/api/middleware/errorHandler.ts
 * PURPOSE: Centralized error handling middleware for Express.
 *          Provides consistent error responses and logging.
 * INPUTS: Errors thrown in route handlers
 * OUTPUTS: Standardized JSON error responses
 * NOTES:
 *   - All errors pass through this middleware
 *   - Stack traces are hidden in production
 *   - Correlation IDs help trace errors in logs
 *   - User-safe messages prevent information leakage
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom error class with HTTP status code.
 * Use this for expected errors (validation, not found, etc.).
 *
 * USAGE:
 * ```typescript
 * throw new AppError('Mission not found', 404);
 * throw new AppError('Invalid input', 400);
 * throw new AppError('Not authorized', 403);
 * ```
 */
export class AppError extends Error {
  /** HTTP status code to return */
  public readonly statusCode: number;
  /** Whether this is an operational error (expected) vs programming error */
  public readonly isOperational: boolean;
  /** Correlation ID for tracing in logs */
  public readonly correlationId: string;

  /**
   * Creates a new AppError.
   *
   * @param message - User-safe error message
   * @param statusCode - HTTP status code (default 500)
   * @param isOperational - Is this expected? (default true)
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.correlationId = uuidv4();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Common error factory functions for consistent error creation.
 */
export const Errors = {
  /** Resource not found (404) */
  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404),

  /** Invalid input data (400) */
  badRequest: (message: string) =>
    new AppError(message, 400),

  /** Authentication required (401) */
  unauthorized: (message: string = 'Authentication required') =>
    new AppError(message, 401),

  /** Permission denied (403) */
  forbidden: (message: string = 'Permission denied') =>
    new AppError(message, 403),

  /** Conflict with existing data (409) */
  conflict: (message: string) =>
    new AppError(message, 409),

  /** Internal server error (500) */
  internal: (message: string = 'Internal server error') =>
    new AppError(message, 500, false),

  /** Service unavailable (503) */
  serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
    new AppError(message, 503),
};

/**
 * Express error handling middleware.
 * This should be the LAST middleware registered.
 *
 * @param err - Error object (can be AppError or native Error)
 * @param req - Express request
 * @param res - Express response
 * @param _next - Next function (unused but required for Express signature)
 *
 * SECURITY CONSIDERATIONS:
 * - Never expose stack traces to users (information leakage)
 * - Don't reveal internal error details
 * - Log everything server-side for debugging
 * - Return generic messages for unexpected errors
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  /*
   * Generate correlation ID if not present.
   * This ID links the user response to server logs for debugging.
   */
  const correlationId = err instanceof AppError
    ? err.correlationId
    : uuidv4();

  /*
   * Determine status code.
   * AppErrors have specific codes; others default to 500.
   */
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  }

  /*
   * Determine if this is an operational (expected) error.
   * Operational: validation failures, not found, permission denied
   * Non-operational: programming bugs, database crashes, etc.
   */
  const isOperational = err instanceof AppError ? err.isOperational : false;

  /*
   * Log the error with full context.
   * Critical for debugging and security monitoring.
   *
   * SECURITY: We log everything server-side but return minimal info to user.
   */
  const logData = {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    statusCode,
    isOperational,
    errorMessage: err.message,
    // Only log stack in development or for unexpected errors
    ...(process.env['NODE_ENV'] !== 'production' || !isOperational
      ? { stack: err.stack }
      : {}),
  };

  if (statusCode >= 500) {
    // Server errors are always logged as errors
    logger.error('Server error occurred', logData);
  } else if (statusCode >= 400) {
    // Client errors are warnings (expected behavior)
    logger.warn('Client error occurred', logData);
  }

  /*
   * Construct user-safe response.
   *
   * SECURITY PRINCIPLE: Fail safely.
   * - Operational errors: Return specific message (it's expected)
   * - Non-operational errors: Return generic message (hide internals)
   * - Stack traces: NEVER expose in production
   */
  const response: {
    success: boolean;
    error: string;
    correlationId: string;
    stack?: string;
  } = {
    success: false,
    error: isOperational
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
    correlationId, // User can report this for support
  };

  /*
   * In development, include stack trace for debugging.
   * NEVER do this in production!
   */
  if (process.env['NODE_ENV'] === 'development' && process.env['EXPOSE_ERROR_STACK'] === 'true') {
    response.stack = err.stack ?? 'No stack trace available';
  }

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers.
 * Express doesn't automatically catch promise rejections.
 *
 * USAGE:
 * ```typescript
 * router.get('/missions', asyncHandler(async (req, res) => {
 *   const missions = await getMissions();
 *   res.json({ success: true, data: missions });
 * }));
 * ```
 *
 * @param fn - Async route handler function
 * @returns Wrapped function that catches errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for unknown routes.
 * Register this AFTER all other routes but BEFORE error handler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = Errors.notFound(`Route ${req.method} ${req.path}`);
  next(error);
}
