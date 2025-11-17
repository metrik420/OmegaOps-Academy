/**
 * FILE: src/utils/logger.ts
 * PURPOSE: Centralized logging configuration using Winston.
 *          Provides structured, consistent logging across the application.
 * INPUTS: LOG_LEVEL, LOG_FORMAT, LOG_FILE_PATH from environment
 * OUTPUTS: Configured Winston logger instance
 * NOTES:
 *   - JSON format for production (easy to parse in log aggregators)
 *   - Simple format for development (human-readable)
 *   - File and console transports for redundancy
 *   - Correlation IDs should be added via request middleware
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Log levels in order of severity (least to most verbose):
 * error: Application errors that need immediate attention
 * warn: Warning conditions that should be investigated
 * info: Normal operational messages
 * http: HTTP request/response logging
 * verbose: Detailed operational information
 * debug: Debug information for development
 * silly: Extremely detailed tracing
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

/**
 * Color coding for console output (development only).
 * Makes it easier to visually scan logs.
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

// Add colors to Winston
winston.addColors(LOG_COLORS);

/**
 * Determines log level based on environment.
 * Production should be less verbose to reduce noise.
 *
 * @returns Log level string
 */
function getLogLevel(): string {
  const envLevel = process.env['LOG_LEVEL'];
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }

  // Default based on environment
  if (process.env['NODE_ENV'] === 'production') {
    return 'info';
  }
  return 'debug';
}

/**
 * Creates format for development (human-readable).
 * Includes colors, timestamps, and pretty-printed metadata.
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present (correlation ID, user ID, etc.)
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

/**
 * Creates format for production (structured JSON).
 * Easy to parse by log aggregators (ELK, CloudWatch, etc.).
 *
 * SECURITY NOTE:
 * Never log sensitive data (passwords, tokens, PII).
 * The redactSensitive function below helps with this.
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // Include stack traces for errors
  winston.format.json()
);

/**
 * Redacts sensitive fields from log metadata.
 * Call this before logging any user input or request data.
 *
 * @param obj - Object potentially containing sensitive data
 * @returns Object with sensitive fields redacted
 *
 * SECURITY: Add any fields that should never be logged
 */
export function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'session',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
  ];

  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains any sensitive field name
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    }

    // Recursively redact nested objects
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key] as Record<string, unknown>);
    }
  }

  return redacted;
}

/**
 * Creates file transport for persistent logging.
 * Logs to file in addition to console for reliability.
 *
 * @returns Winston file transport or null if disabled
 */
function createFileTransport(): winston.transport | null {
  const logFilePath = process.env['LOG_FILE_PATH'];

  if (!logFilePath) {
    return null;
  }

  // Ensure log directory exists
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return new winston.transports.File({
    filename: logFilePath,
    maxsize: parseInt(process.env['LOG_MAX_SIZE'] || '10485760', 10), // 10MB default
    maxFiles: parseInt(process.env['LOG_MAX_FILES'] || '5', 10),
    format: productionFormat, // Always use JSON for file logs
  });
}

/**
 * Main logger instance.
 * Use this throughout the application for consistent logging.
 *
 * USAGE:
 * ```typescript
 * import { logger } from './utils/logger';
 *
 * logger.info('Server started', { port: 3001 });
 * logger.error('Database connection failed', { error: err.message });
 * logger.debug('Processing request', { path: '/api/missions', method: 'GET' });
 * ```
 */
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: process.env['NODE_ENV'] === 'production'
      ? productionFormat
      : developmentFormat,
  }),
];

// Add file transport if configured
const fileTransport = createFileTransport();
if (fileTransport) {
  transports.push(fileTransport);
}

export const logger = winston.createLogger({
  level: getLogLevel(),
  levels: LOG_LEVELS,
  transports,
  // Exit on error = false prevents process from dying on log write errors
  exitOnError: false,
});

/**
 * Creates a child logger with additional default metadata.
 * Useful for adding correlation IDs or module names.
 *
 * @param defaultMeta - Metadata to include in all logs from this child
 * @returns Child logger instance
 *
 * USAGE:
 * ```typescript
 * const requestLogger = createChildLogger({ correlationId: 'abc123' });
 * requestLogger.info('Processing request'); // Includes correlationId automatically
 * ```
 */
export function createChildLogger(defaultMeta: Record<string, unknown>): winston.Logger {
  return logger.child(defaultMeta);
}

/**
 * Logs an HTTP request (used by request logging middleware).
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param statusCode - Response status code
 * @param duration - Request duration in milliseconds
 * @param meta - Additional metadata (user ID, etc.)
 */
export function logHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  meta?: Record<string, unknown>
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';

  logger.log(level, `${method} ${path} ${statusCode} ${duration}ms`, {
    method,
    path,
    statusCode,
    duration,
    ...meta,
  });
}

// Log startup information
logger.info('Logger initialized', {
  level: getLogLevel(),
  environment: process.env['NODE_ENV'] || 'development',
});
