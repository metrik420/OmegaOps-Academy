/**
 * FILE: src/app.ts
 * PURPOSE: Main Express application entry point for OmegaOps Academy API.
 *          Configures middleware, routes, database, and error handling.
 * INPUTS: Environment variables from .env file
 * OUTPUTS: Running Express server on configured port
 * SIDE EFFECTS:
 *   - Initializes SQLite database
 *   - Starts HTTP server
 *   - Sets up graceful shutdown handlers
 * NOTES:
 *   - This is the application bootstrap file
 *   - All middleware is configured here in proper order
 *   - Database is initialized before server starts
 *   - Graceful shutdown ensures data integrity on termination
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
// This ensures all modules have access to config values
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { logger, logHttpRequest } from './utils/logger';
import { initializeDatabase, closeDatabase } from './database/db';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';

// Import route modules
import missionsRouter from './api/routes/missions';
import labsRouter from './api/routes/labs';
import knowledgeRouter from './api/routes/knowledge';
import softwareRouter from './api/routes/software';
import updatesRouter from './api/routes/updates';
import adminRouter from './api/routes/admin';
import progressRouter from './api/routes/progress';
import roadmapRouter from './api/routes/roadmap';

/**
 * Creates and configures the Express application.
 * Separated from server startup for testability.
 *
 * @returns Configured Express app instance
 */
function createApp(): Express {
  const app = express();

  /*
   * ==========================================================================
   * SECURITY MIDDLEWARE (ORDER MATTERS!)
   * ==========================================================================
   * These should be first to protect all routes.
   */

  /*
   * Helmet: Sets various HTTP headers for security.
   * - Hides X-Powered-By header (fingerprinting prevention)
   * - Sets X-Frame-Options: DENY (clickjacking protection)
   * - Sets X-Content-Type-Options: nosniff (MIME sniffing prevention)
   * - Sets Referrer-Policy: strict-origin-when-cross-origin
   * - Sets X-XSS-Protection: 0 (deprecated, disabled intentionally)
   */
  app.use(helmet({
    /*
     * Content Security Policy configuration.
     * This is restrictive by default. Adjust for your needs.
     */
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for now
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    /*
     * HSTS: Enforce HTTPS.
     * max-age: 1 year (31536000 seconds)
     * includeSubDomains: Apply to all subdomains
     * preload: Allow inclusion in browser preload lists
     */
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    /*
     * Hide X-Powered-By header to prevent fingerprinting.
     * Attackers can't tell this is Express.
     */
    hidePoweredBy: true,
    /*
     * Prevent browsers from MIME-sniffing.
     * Forces browser to respect Content-Type header.
     */
    noSniff: true,
    /*
     * Referrer policy: Only send origin (not full URL) to external sites.
     * Prevents leaking sensitive URL parameters.
     */
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  /*
   * CORS: Cross-Origin Resource Sharing configuration.
   * Controls which origins can make requests to this API.
   *
   * SECURITY NOTE:
   * In production, be specific about allowed origins.
   * Never use '*' with credentials.
   */
  const allowedOrigins = process.env['CORS_ALLOWED_ORIGINS']?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      /*
       * Allow requests with no origin (mobile apps, curl, etc.)
       * In production, you might want to restrict this.
       */
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS request from unauthorized origin', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: process.env['CORS_ALLOW_CREDENTIALS'] === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 86400, // Cache preflight requests for 24 hours
  }));

  /*
   * ==========================================================================
   * REQUEST PARSING MIDDLEWARE
   * ==========================================================================
   */

  /*
   * Parse JSON request bodies.
   * Limit size to prevent DoS via large payloads.
   */
  app.use(express.json({
    limit: process.env['MAX_REQUEST_SIZE'] || '10mb',
    /*
     * Strict mode: Only accept arrays and objects.
     * Prevents primitives like "true" or "null" as body.
     */
    strict: true,
  }));

  /*
   * Parse URL-encoded bodies (form submissions).
   * Extended: true allows nested objects.
   */
  app.use(express.urlencoded({
    extended: true,
    limit: process.env['MAX_REQUEST_SIZE'] || '10mb',
  }));

  /*
   * ==========================================================================
   * REQUEST LOGGING MIDDLEWARE
   * ==========================================================================
   */

  if (process.env['ENABLE_REQUEST_LOGGING'] !== 'false') {
    app.use((req: Request, res: Response, next) => {
      const start = Date.now();

      /*
       * Log after response is finished.
       * This captures the actual status code and duration.
       */
      res.on('finish', () => {
        const duration = Date.now() - start;
        logHttpRequest(req.method, req.path, res.statusCode, duration, {
          query: req.query,
          ip: req.ip,
        });
      });

      next();
    });
  }

  /*
   * ==========================================================================
   * HEALTH CHECK ENDPOINT
   * ==========================================================================
   * Simple endpoint for load balancers and monitoring.
   * Returns 200 if server is running.
   */
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env['npm_package_version'] || '1.0.0',
      },
    });
  });

  /*
   * ==========================================================================
   * API ROUTES
   * ==========================================================================
   * All routes are prefixed with /api for clarity.
   * Each router handles its own validation and response.
   */

  // Public routes (no auth required)
  app.use('/api/roadmap', roadmapRouter);
  app.use('/api/missions', missionsRouter);
  app.use('/api/labs', labsRouter);
  app.use('/api/knowledge', knowledgeRouter);
  app.use('/api/software', softwareRouter);
  app.use('/api/updates', updatesRouter);
  app.use('/api/progress', progressRouter);

  // Admin routes (auth required via middleware in router)
  app.use('/api/admin', adminRouter);

  /*
   * ==========================================================================
   * ERROR HANDLING MIDDLEWARE
   * ==========================================================================
   * These MUST be last in the middleware chain.
   */

  // Catch-all for undefined routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Starts the Express server.
 * Initializes database before accepting requests.
 *
 * @returns void
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting OmegaOps Academy API server...');

    /*
     * Initialize database BEFORE creating app.
     * This ensures database is ready when routes need it.
     */
    logger.info('Initializing database...');
    initializeDatabase();
    logger.info('Database initialized successfully');

    /*
     * Optionally seed database with sample data.
     * Useful for development and testing.
     */
    if (process.env['SEED_DATABASE_ON_STARTUP'] === 'true') {
      logger.info('Seeding database with sample data...');
      const { seedDatabase } = await import('./database/seeds/seed');
      await seedDatabase();
      logger.info('Database seeded successfully');
    }

    // Create and configure Express app
    const app = createApp();

    // Get port from environment
    const port = parseInt(process.env['PORT'] || '3001', 10);

    /*
     * Start listening for requests.
     * The callback confirms the server is running.
     */
    const server = app.listen(port, () => {
      logger.info(`Server is running`, {
        port,
        environment: process.env['NODE_ENV'] || 'development',
        pid: process.pid,
      });
      logger.info(`API available at: http://localhost:${port}/api`);
      logger.info(`Health check: http://localhost:${port}/health`);
    });

    /*
     * ==========================================================================
     * GRACEFUL SHUTDOWN HANDLERS
     * ==========================================================================
     * Ensure clean shutdown on process termination.
     * Critical for:
     * - Completing in-flight requests
     * - Closing database connections
     * - Releasing resources
     */

    const shutdownHandler = (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);

      /*
       * Stop accepting new connections.
       * Existing requests will complete.
       */
      server.close(() => {
        logger.info('HTTP server closed');

        // Close database connection
        closeDatabase();
        logger.info('Database connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      /*
       * Force shutdown after timeout.
       * Prevents hanging on stuck requests.
       */
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000); // 30 second timeout
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    /*
     * Handle uncaught exceptions.
     * These are programming errors and should be logged/alerted.
     */
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      // Exit with error code, let process manager restart
      process.exit(1);
    });

    /*
     * Handle unhandled promise rejections.
     * These indicate async errors that weren't caught.
     */
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
      // Exit with error code
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
export { createApp };
