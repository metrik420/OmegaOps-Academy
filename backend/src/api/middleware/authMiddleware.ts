/**
 * FILE: src/api/middleware/authMiddleware.ts
 * PURPOSE: Authentication and authorization middleware for protecting routes.
 *          Provides JWT verification, user attachment, admin checks, and rate limiting.
 * INPUTS: Express Request object with cookies or Authorization header
 * OUTPUTS: Modified Request object with authenticated user data
 * SIDE EFFECTS:
 *   - Attaches user/admin data to req.user
 *   - Logs unauthorized access attempts
 *   - Blocks requests exceeding rate limits
 * NOTES:
 *   - JWT can be provided via: Cookie (preferred) or Authorization header (Bearer)
 *   - Rate limiting uses in-memory store (use Redis in production for distributed systems)
 *   - CSRF protection on state-changing methods (POST, PUT, DELETE, PATCH)
 *   - All middleware functions are composable (use with app.use() or per-route)
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../../services/AuthService';
import { logger } from '../../utils/logger';
import type { JWTPayload } from '../../types/auth.types';

/**
 * Extend Express Request to include authenticated user.
 * This allows req.user to be available in all protected routes.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * ==========================================================================
 * AUTHENTICATION MIDDLEWARE
 * ==========================================================================
 */

/**
 * Verifies JWT token and attaches user to request.
 *
 * FLOW:
 * 1. Extract JWT from cookie or Authorization header
 * 2. Verify JWT signature and expiration
 * 3. Attach user payload to req.user
 * 4. Continue to next middleware or route handler
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 * @returns void
 * @throws 401 if token missing, invalid, or expired
 * @complexity O(1) - JWT verification is constant time
 * @security Rejects expired, malformed, or unsigned tokens
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    /*
     * Extract JWT from multiple sources (priority order):
     * 1. Cookie: accessToken (HttpOnly, Secure) - PREFERRED
     * 2. Authorization header: Bearer <token> - For API clients
     *
     * WHY cookies are preferred:
     * - HttpOnly flag prevents XSS attacks
     * - Secure flag ensures HTTPS-only transmission
     * - SameSite=Strict prevents CSRF attacks
     * - Automatic transmission by browser (no manual header management)
     */
    let token: string | undefined;

    // Check cookie first (preferred)
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // Fallback to Authorization header
    else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      logger.debug('Authentication failed: No token provided', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
      return;
    }

    /*
     * Verify JWT and extract payload.
     * AuthService.verifyAccessToken checks:
     * - Signature matches (HMAC-SHA256)
     * - Token not expired
     * - Issuer and audience match
     */
    const payload = AuthService.verifyAccessToken(token);

    if (!payload) {
      logger.debug('Authentication failed: Invalid token', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token. Please log in again.',
        },
      });
      return;
    }

    /*
     * Attach user payload to request.
     * Available to all subsequent middleware and route handlers.
     */
    req.user = payload;

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during authentication.',
      },
    });
  }
}

/**
 * Optional authentication middleware.
 * Attaches user if token valid, but doesn't block request if no token.
 *
 * USE CASE:
 * - Public routes that show extra content for authenticated users
 * - API endpoints that adjust behavior based on auth status
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 * @returns void
 * @complexity O(1)
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (token) {
      const payload = AuthService.verifyAccessToken(token);
      if (payload) {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // Silently fail and continue without authentication
    next();
  }
}

/**
 * ==========================================================================
 * AUTHORIZATION MIDDLEWARE
 * ==========================================================================
 */

/**
 * Verifies that authenticated user is an admin.
 *
 * REQUIREMENTS:
 * - User must be authenticated (authMiddleware must run first)
 * - User must have isAdmin = true in JWT payload
 * - Only one admin allowed: username must be 'metrik'
 *
 * @param req - Express Request (with req.user attached)
 * @param res - Express Response
 * @param next - Express NextFunction
 * @returns void
 * @throws 401 if not authenticated
 * @throws 403 if not admin
 * @complexity O(1)
 * @security Single admin constraint enforced
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    /*
     * Check user authenticated.
     * If authMiddleware not run first, req.user will be undefined.
     */
    if (!req.user) {
      logger.warn('Admin access attempt without authentication', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    /*
     * Check user is admin.
     * isAdmin flag is set in JWT payload during admin login.
     */
    if (!req.user.isAdmin) {
      logger.warn('Non-admin user attempted admin access', {
        userId: req.user.userId,
        username: req.user.username,
        path: req.path,
        ip: req.ip,
      });
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin privileges required.',
        },
      });
      return;
    }

    /*
     * SECURITY: Enforce single admin constraint.
     * Only username 'metrik' is allowed admin access.
     *
     * WHY this check?
     * - Prevents privilege escalation attacks
     * - Ensures only the seeded admin can access admin routes
     * - Protects against JWT payload manipulation
     */
    if (req.user.username !== 'metrik') {
      logger.error('Invalid admin username detected (possible attack)', {
        userId: req.user.userId,
        username: req.user.username,
        path: req.path,
        ip: req.ip,
      });
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Invalid admin credentials.',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during authorization.',
      },
    });
  }
}

/**
 * ==========================================================================
 * RATE LIMITING MIDDLEWARE
 * ==========================================================================
 */

/**
 * Rate limiter for authentication endpoints.
 * Prevents brute force attacks on login, registration, password reset.
 *
 * LIMITS:
 * - 5 requests per 15 minutes per IP
 * - Applies to: login, register, forgot-password, reset-password
 *
 * WHY these limits?
 * - 5 attempts: Allows legitimate typos but blocks brute force
 * - 15 minutes: Long enough to deter attacks, short enough for usability
 * - Per IP: Simple and effective for most cases
 *
 * PRODUCTION NOTE:
 * - Use Redis store for distributed systems (multiple backend instances)
 * - Consider per-user rate limits (e.g., 10 failed logins per hour)
 * - Implement exponential backoff for repeated violations
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  /*
   * Custom key generator.
   * Uses IP address as key (default behavior).
   * Can be extended to use user ID for authenticated rate limits.
   */
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  /*
   * Skip successful requests.
   * Only failed attempts count toward rate limit.
   * This requires custom logic in route handlers to call req.rateLimit.resetKey().
   */
  skipSuccessfulRequests: false,
  /*
   * Skip failed requests.
   * Set to false to count all requests.
   */
  skipFailedRequests: false,
  /*
   * Handler called when rate limit exceeded.
   * Logs the event for security monitoring.
   */
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
      },
    });
  },
});

/**
 * Stricter rate limiter for password reset emails.
 * Prevents email flooding and abuse.
 *
 * LIMITS:
 * - 3 requests per hour per IP
 *
 * WHY stricter?
 * - Email sending is resource-intensive
 * - Prevents spam/abuse of email service
 * - Reduces attack surface for email enumeration
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset requests. Please try again in 1 hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many password reset requests. Please try again in 1 hour.',
      },
    });
  },
});

/**
 * General API rate limiter.
 * Protects all API endpoints from abuse.
 *
 * LIMITS:
 * - 100 requests per 15 minutes per IP
 *
 * WHY these limits?
 * - 100 requests: Generous for normal usage, restrictive for abuse
 * - 15 minutes: Standard window for rate limiting
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * ==========================================================================
 * CSRF PROTECTION MIDDLEWARE
 * ==========================================================================
 */

/**
 * CSRF token verification middleware.
 * Protects state-changing operations from cross-site request forgery.
 *
 * HOW IT WORKS:
 * 1. Client requests CSRF token via GET /auth/csrf-token
 * 2. Server generates token and stores in session
 * 3. Client includes token in X-CSRF-Token header for POST/PUT/DELETE
 * 4. Server verifies token matches session
 *
 * APPLIES TO:
 * - POST, PUT, DELETE, PATCH methods
 * - Skips GET, HEAD, OPTIONS (safe methods)
 *
 * WHY CSRF protection with JWT?
 * - JWTs in cookies are vulnerable to CSRF (auto-sent by browser)
 * - CSRF tokens prevent unauthorized state changes
 * - Double-submit cookie pattern provides additional security layer
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 * @returns void
 * @throws 403 if CSRF token missing or invalid
 * @complexity O(1)
 * @security Implements double-submit cookie pattern
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  /*
   * Skip CSRF check for safe methods.
   * GET, HEAD, OPTIONS don't modify state.
   */
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  /*
   * Skip CSRF check if using Bearer token (not cookie).
   * Bearer tokens are not auto-sent by browser (no CSRF risk).
   */
  if (req.headers.authorization) {
    next();
    return;
  }

  /*
   * Extract CSRF token from header.
   */
  const csrfToken = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrfToken;

  /*
   * Verify token present.
   */
  if (!csrfToken || !csrfCookie) {
    logger.warn('CSRF token missing', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required for this operation.',
      },
    });
    return;
  }

  /*
   * Verify token matches cookie (double-submit pattern).
   */
  if (csrfToken !== csrfCookie) {
    logger.warn('CSRF token mismatch (possible attack)', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token.',
      },
    });
    return;
  }

  next();
}
