/**
 * FILE: src/api/middleware/auth.ts
 * PURPOSE: Authentication middleware for admin-protected routes.
 *          Uses HTTP Basic Auth for MVP simplicity.
 * INPUTS: Authorization header from request
 * OUTPUTS: Proceeds to next middleware if authenticated, 401/403 otherwise
 * SIDE EFFECTS: Sets req.adminUser if authenticated
 * NOTES:
 *   - Basic Auth over HTTPS is acceptable for admin-only routes
 *   - In production, consider JWT or session-based auth
 *   - Passwords should be bcrypt-hashed in real deployment
 *   - Rate limiting should be applied to prevent brute force
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { logger } from '../../utils/logger';

/**
 * Extended Express Request with admin user info.
 * This augments the standard Request type after authentication.
 */
export interface AuthenticatedRequest extends Request {
  adminUser?: {
    username: string;
    authenticatedAt: Date;
  };
}

/**
 * Cached bcrypt hash for admin password.
 * Generated once on first request to avoid hashing on every auth attempt.
 * In production, this would be stored in database with per-user hashes.
 */
let cachedPasswordHash: string | null = null;

/**
 * Gets or creates the bcrypt hash for the admin password.
 * Caching prevents expensive bcrypt operations on every request.
 *
 * @returns Promise<string> - Bcrypt hash of admin password
 *
 * SECURITY NOTE:
 * - bcrypt automatically handles salting
 * - Cost factor 12 provides good security/performance balance
 * - In production, store hash in database, not compute at runtime
 */
async function getPasswordHash(): Promise<string> {
  if (cachedPasswordHash) {
    return cachedPasswordHash;
  }

  const adminPassword = process.env['ADMIN_PASSWORD'];
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable not set');
  }

  /*
   * Cost factor 12 is recommended minimum for production.
   * Higher = more secure but slower. 12 takes ~250ms on modern hardware.
   */
  cachedPasswordHash = await bcrypt.hash(adminPassword, 12);
  return cachedPasswordHash;
}

/**
 * HTTP Basic Authentication middleware for admin routes.
 *
 * Flow:
 * 1. Extract Authorization header
 * 2. Decode Base64 credentials
 * 3. Verify username matches ADMIN_USERNAME env var
 * 4. Verify password against bcrypt hash
 * 5. Attach admin info to request
 * 6. Call next() to proceed
 *
 * SECURITY CONSIDERATIONS:
 * - Uses constant-time comparison (bcrypt.compare) to prevent timing attacks
 * - Logs failed attempts for security monitoring
 * - Returns generic error message to prevent enumeration
 * - Should be paired with rate limiting on admin routes
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 */
export async function basicAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];

  /*
   * Check if Authorization header is present.
   * Without it, we can't authenticate.
   */
  if (!authHeader) {
    logger.warn('Admin auth attempt without Authorization header', {
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  /*
   * Basic Auth format: "Basic base64(username:password)"
   * We need to extract and decode the base64 part.
   */
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic') {
    logger.warn('Invalid Authorization header format', {
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid authentication format',
    });
    return;
  }

  /*
   * Decode Base64 credentials.
   * Format after decoding: "username:password"
   */
  let credentials: string;
  try {
    credentials = Buffer.from(parts[1] ?? '', 'base64').toString('utf-8');
  } catch {
    logger.warn('Failed to decode Base64 credentials', {
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid credentials format',
    });
    return;
  }

  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) {
    logger.warn('Malformed credentials (missing colon)', {
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid credentials format',
    });
    return;
  }

  const username = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);

  /*
   * Verify username matches expected admin username.
   * Note: In production with multiple admins, this would be a DB lookup.
   */
  const expectedUsername = process.env['ADMIN_USERNAME'];
  if (!expectedUsername) {
    logger.error('ADMIN_USERNAME environment variable not set');
    res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });
    return;
  }

  if (username !== expectedUsername) {
    /*
     * SECURITY: Don't reveal whether username or password was wrong.
     * This prevents username enumeration attacks.
     */
    logger.warn('Failed admin login attempt - invalid username', {
      ip: req.ip,
      path: req.path,
      attemptedUsername: username,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
    return;
  }

  /*
   * Verify password using bcrypt.compare.
   * This is constant-time, preventing timing attacks.
   */
  try {
    const passwordHash = await getPasswordHash();
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!isValid) {
      logger.warn('Failed admin login attempt - invalid password', {
        ip: req.ip,
        path: req.path,
        username,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }
  } catch (error) {
    logger.error('Password verification failed', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
      path: req.path,
    });

    res.status(500).json({
      success: false,
      error: 'Authentication system error',
    });
    return;
  }

  /*
   * Authentication successful!
   * Attach admin user info to request for downstream handlers.
   */
  req.adminUser = {
    username,
    authenticatedAt: new Date(),
  };

  logger.info('Admin authenticated successfully', {
    username,
    ip: req.ip,
    path: req.path,
  });

  next();
}

/**
 * Middleware to ensure user is authenticated as admin.
 * Use this for routes that require admin access.
 *
 * USAGE:
 * ```typescript
 * router.post('/admin/action', requireAdmin, (req, res) => {
 *   const admin = (req as AuthenticatedRequest).adminUser;
 *   // Handle admin action
 * });
 * ```
 */
export const requireAdmin = basicAuthMiddleware;

/**
 * Helper to extract admin user from authenticated request.
 * Throws if not authenticated (should only be used after requireAdmin).
 *
 * @param req - Express request (after auth middleware)
 * @returns Admin user info
 * @throws Error if not authenticated
 */
export function getAdminUser(req: Request): { username: string; authenticatedAt: Date } {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.adminUser) {
    throw new Error('Request not authenticated');
  }
  return authReq.adminUser;
}
